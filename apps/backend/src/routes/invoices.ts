import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly, tenantOnly, ownerOnly } from '../middleware/rbac';
import { generateMonthlyInvoices } from '../lib/billing';
import { sendOverdueReminder } from '../lib/gupshup';
import { generateReceiptPdf } from '../lib/receipt';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];


const CreateInvoiceSchema = z.object({
  tenantId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  amountDue: z.number().positive('Amount due must be a positive number'),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
});

export const invoiceRoutes = Router();

// GET /api/invoices?tenantId=&month=&year=&status=&propertyId=&page=&limit=
invoiceRoutes.get('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { tenantId, month, year, status, propertyId, page = '1', limit = '20' } = req.query;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  // If filtering by property, resolve tenant IDs
  let tenantIds: string[] | undefined;
  if (propertyId) {
    const tenants = await prisma.tenant.findMany({
      where: { propertyId: String(propertyId) },
      select: { id: true },
    });
    tenantIds = tenants.map(t => t.id);
  }

  const validStatuses = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];
  const where = {
    ...(tenantId ? { tenantId: String(tenantId) } : {}),
    ...(tenantIds ? { tenantId: { in: tenantIds } } : {}),
    ...(month ? { month: Number(month) } : {}),
    ...(year ? { year: Number(year) } : {}),
    ...(status && validStatuses.includes(String(status)) ? { status: String(status) as any } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        tenant: {
          include: {
            user: { select: { name: true, phone: true } },
            bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
          },
        },
        payments: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take,
      skip,
    }),
    prisma.invoice.count({ where }),
  ]);
  return res.json({ success: true, data: invoices, total, page: Number(page), pages: Math.ceil(total / take) });
});

// GET /api/invoices/my — tenant's own invoices
invoiceRoutes.get('/my', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant record not found' });

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: tenant.id },
    include: { payments: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return res.json({ success: true, data: invoices });
});

// GET /api/invoices/:id — single invoice detail (staff)
invoiceRoutes.get('/:id', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      tenant: {
        include: {
          user: { select: { name: true, phone: true } },
          bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
        },
      },
      payments: { orderBy: { date: 'asc' } },
    },
  });
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
  return res.json({ success: true, data: invoice });
});

// GET /api/invoices/:id/receipt — download PDF receipt
invoiceRoutes.get('/:id/receipt', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Tenants can only download their own receipts
    if (req.user!.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
      const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { tenantId: true, month: true, year: true } });
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      if (!tenant || invoice.tenantId !== tenant.id) {
        return res.status(403).json({ success: false, error: 'Not authorised' });
      }
    }

    const buffer = await generateReceiptPdf(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { month: true, year: true } });
    const monthName = MONTH_NAMES[(invoice?.month ?? 1) - 1];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${monthName}-${invoice?.year}.pdf"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[receipt]', err);
    if (!res.headersSent) {
      const status = err.message === 'Invoice not found' ? 404
        : err.message === 'No payments recorded yet' ? 400 : 500;
      res.status(status).json({ success: false, error: err.message ?? 'Failed to generate receipt' });
    }
  }
});

// POST /api/invoices — manually create an invoice
invoiceRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const parsed = CreateInvoiceSchema.safeParse({
    ...req.body,
    month: Number(req.body.month),
    year: Number(req.body.year),
    amountDue: Number(req.body.amountDue),
  });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { tenantId, month, year, amountDue, dueDate, notes } = parsed.data;
  try {
    const invoice = await prisma.invoice.create({
      data: { tenantId, month, year, amountDue, dueDate: new Date(dueDate), notes },
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Invoice already exists for this tenant/month/year' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

/**
 * POST /api/invoices/generate-monthly
 * Owner-only: auto-generate monthly invoices for all active tenants.
 * Safe to run multiple times — skips tenants who already have an invoice.
 * Body: { month, year }
 */
invoiceRoutes.post('/generate-monthly', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const month = Number(req.body.month) || new Date().getMonth() + 1;
  const year = Number(req.body.year) || new Date().getFullYear();

  // Return immediately — generation runs in the background to avoid gateway timeouts
  res.json({ success: true, data: { month, year, message: 'Invoice generation started. Check back in a moment.' } });

  generateMonthlyInvoices(month, year)
    .then(created => console.log(`[generate-monthly] ${created} invoice(s) generated for ${month}/${year}`))
    .catch(err => console.error('[generate-monthly]', err));
});

/**
 * POST /api/invoices/:id/whatsapp-reminder
 * Staff triggers a one-off WhatsApp overdue reminder for a single invoice.
 */
invoiceRoutes.post('/:id/whatsapp-reminder', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: {
          include: {
            user: { select: { name: true, phone: true } },
            property: { select: { upiQrUrl: true } },
          },
        },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const phone = invoice.tenant.user.phone;
    if (!phone) return res.status(400).json({ success: false, error: 'Tenant has no phone number' });

    const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
    const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    const qrImageUrl = invoice.tenant.property?.upiQrUrl ?? null;

    const ok = await sendOverdueReminder(phone, invoice.tenant.user.name, remaining, invoice.month, invoice.year, daysOverdue, qrImageUrl);
    if (!ok) return res.status(500).json({ success: false, error: 'WhatsApp send failed' });

    return res.json({ success: true, message: 'Reminder sent' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to send reminder' });
  }
});
