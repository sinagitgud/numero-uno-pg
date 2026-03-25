import { Router, Response, Request } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly } from '../middleware/rbac';
import { createPaymentLink, verifyWebhookSignature, razorpayAvailable } from '../lib/razorpay';
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

// Separate rate limiter for webhook — stricter than the global one
const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: { success: false, error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRoutes = Router();

// ─── Manual payment (cash / bank / UPI recorded by staff) ────────────────────

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
        ).catch(() => {}); // fire-and-forget
      }
    }

    return res.status(201).json({ success: true, data: payment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// ─── Create Razorpay payment link for an invoice ─────────────────────────────

paymentRoutes.post('/razorpay-order', authenticate, async (req: AuthRequest, res: Response) => {
  const { invoiceId } = req.body;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
    if (remaining <= 0) return res.status(400).json({ success: false, error: 'Invoice already paid' });

    const link = await createPaymentLink({
      invoiceId,
      amount: remaining,
      tenantName: invoice.tenant.user.name,
      tenantPhone: invoice.tenant.user.phone || '',
      description: `Rent for month ${invoice.month}/${invoice.year}`,
    });

    // Save the payment link ID on the invoice for tracking
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { razorpayLinkId: link.id } as any, // graceful — field may not be in schema yet
    }).catch(() => {}); // don't fail if field doesn't exist yet

    return res.json({
      success: true,
      data: { ...link, razorpayActive: razorpayAvailable },
    });
  } catch (err: any) {
    console.error('[payments/razorpay-order]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create payment link' });
  }
});

// ─── Razorpay webhook — auto-reconcile online payments ───────────────────────

paymentRoutes.post('/razorpay-webhook', webhookRateLimit, async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;

  // Verify signature using raw body string
  const rawBody = JSON.stringify(req.body);
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[Razorpay webhook] Invalid signature — rejected');
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  const event = req.body.event as string;
  console.log('[Razorpay webhook] Event:', event);

  // Payment link paid
  if (event === 'payment_link.paid') {
    const pl = req.body.payload?.payment_link?.entity;
    const payment = req.body.payload?.payment?.entity;
    const invoiceId = pl?.notes?.invoice_id;

    if (invoiceId && payment?.amount) {
      try {
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice) {
          const amountInRupees = Number(payment.amount) / 100;
          const totalPaid = Number(invoice.amountPaid) + amountInRupees;
          const newStatus = totalPaid >= Number(invoice.amountDue) ? 'PAID'
            : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

          await prisma.$transaction([
            prisma.payment.create({
              data: {
                invoiceId,
                amount: amountInRupees,
                date: new Date(),
                mode: 'UPI',
                recordedBy: 'SYSTEM',
                notes: `Razorpay auto: ${payment.id}`,
              },
            }),
            prisma.invoice.update({
              where: { id: invoiceId },
              data: { amountPaid: totalPaid, status: newStatus },
            }),
          ]);
          console.log(`[Razorpay webhook] Invoice ${invoiceId} → ${newStatus}`);
        }
      } catch (err) {
        console.error('[Razorpay webhook] Reconciliation error:', err);
      }
    }
  }

  return res.json({ success: true });
});
