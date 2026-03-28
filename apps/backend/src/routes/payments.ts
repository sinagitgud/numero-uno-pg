import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly, tenantOnly } from '../middleware/rbac';
import { sendPaymentReceipt } from '../lib/gupshup';

const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive('Payment amount must be a positive number'),
  date: z.string().min(1),
  mode: z.enum(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER'], {
    errorMap: () => ({ message: 'mode must be one of: UPI, CASH, CARD, BANK_TRANSFER' }),
  }),
  notes: z.string().optional(),
});

const SelfReportSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  mode: z.enum(['UPI', 'CASH', 'BANK_TRANSFER']),
  notes: z.string().optional(),
});

export const paymentRoutes = Router();

// ─── Manual payment recorded by staff (APPROVED immediately) ─────────────────

paymentRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const parsed = RecordPaymentSchema.safeParse({ ...req.body, amount: Number(req.body.amount) });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { invoiceId, amount, date, mode, notes } = parsed.data;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        tenant: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const totalPaid = Number(invoice.amountPaid) + Number(amount);
    const newStatus = totalPaid >= Number(invoice.amountDue) ? 'PAID'
      : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId, amount, date: new Date(date), mode,
          recordedBy: req.user!.id, notes,
          status: 'APPROVED',
          approvedBy: req.user!.id,
          approvedAt: new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: totalPaid, status: newStatus },
      }),
    ]);

    // Send WhatsApp receipt on full payment
    if (newStatus === 'PAID') {
      const phone = invoice.tenant.user.phone;
      if (phone) {
        sendPaymentReceipt(
          phone, invoice.tenant.user.name, Number(amount),
          invoice.month, invoice.year, mode
        ).catch(() => {});
      }
    }

    return res.status(201).json({ success: true, data: payment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// ─── Tenant self-reports a payment (PENDING_APPROVAL) ────────────────────────

paymentRoutes.post('/self-report', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const parsed = SelfReportSchema.safeParse({ ...req.body, amount: Number(req.body.amount) });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { invoiceId, amount, mode, notes } = parsed.data;

  try {
    // Verify invoice belongs to this tenant
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant record not found' });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (invoice.tenantId !== tenant.id) return res.status(403).json({ success: false, error: 'Not your invoice' });
    if (invoice.status === 'PAID') return res.status(400).json({ success: false, error: 'Invoice already fully paid' });

    // Check for existing pending approval on this invoice
    const existing = await prisma.payment.findFirst({
      where: { invoiceId, status: 'PENDING_APPROVAL' },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A payment is already awaiting approval for this invoice' });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        date: new Date(),
        mode,
        recordedBy: req.user!.id,
        notes: notes ?? null,
        status: 'PENDING_APPROVAL',
      },
    });

    return res.status(201).json({ success: true, data: payment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to submit payment' });
  }
});

// ─── Staff: list all pending payment approvals ────────────────────────────────

paymentRoutes.get('/pending', authenticate, salesOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.payment.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        invoice: {
          include: {
            tenant: {
              include: {
                user: { select: { name: true, phone: true } },
                bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: pending });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch pending payments' });
  }
});

// ─── Staff: approve a pending payment ────────────────────────────────────────

paymentRoutes.post('/:id/approve', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          include: { tenant: { include: { user: { select: { name: true, phone: true } } } } },
        },
      },
    });

    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, error: 'Payment is not pending approval' });
    }

    const invoice = payment.invoice;
    const totalPaid = Number(invoice.amountPaid) + Number(payment.amount);
    const newInvoiceStatus = totalPaid >= Number(invoice.amountDue) ? 'PAID'
      : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date() },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: totalPaid, status: newInvoiceStatus },
      }),
    ]);

    // Send WhatsApp receipt on full payment
    const phone = invoice.tenant.user.phone;
    if (phone && newInvoiceStatus === 'PAID') {
      sendPaymentReceipt(
        phone, invoice.tenant.user.name, Number(payment.amount),
        invoice.month, invoice.year, payment.mode
      ).catch(() => {});
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to approve payment' });
  }
});

// ─── Staff: reject a pending payment ─────────────────────────────────────────

paymentRoutes.post('/:id/reject', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, error: 'Payment is not pending approval' });
    }

    await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', approvedBy: req.user!.id, approvedAt: new Date() },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to reject payment' });
  }
});