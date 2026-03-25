import { Router, Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly, tenantOnly, ownerOnly } from '../middleware/rbac';
import { generateMonthlyInvoices } from '../lib/billing';
import { sendOverdueReminder } from '../lib/gupshup';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function amountInWords(amount: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (amount === 0) return 'Zero';
  const n = Math.round(amount);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + amountInWords(n % 100) : '');
  if (n < 100000) return amountInWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + amountInWords(n % 1000) : '');
  return amountInWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + amountInWords(n % 100000) : '');
}

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
    // Fetch invoice with all needed relations
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: {
          include: {
            user: { select: { name: true, phone: true } },
            bed: { include: { room: { include: { property: { select: { name: true, address: true, code: true } } } } } },
          },
        },
        payments: { orderBy: { date: 'asc' } },
      },
    });

    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    // Tenants can only download their own receipts
    if (req.user!.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
      if (!tenant || invoice.tenantId !== tenant.id) {
        return res.status(403).json({ success: false, error: 'Not authorised' });
      }
    }

    // Only generate receipt if there are payments
    if (invoice.payments.length === 0) {
      return res.status(400).json({ success: false, error: 'No payments recorded yet' });
    }

    const tenantName = invoice.tenant.user.name;
    const propertyName = invoice.tenant.bed.room.property.name;
    const propertyAddress = invoice.tenant.bed.room.property.address;
    const roomNo = invoice.tenant.bed.room.number;
    const bedLabel = invoice.tenant.bed.label;
    const monthName = MONTH_NAMES[invoice.month - 1];
    const totalPaid = Number(invoice.amountPaid);
    const receiptNo = `REC-${invoice.id.slice(-6).toUpperCase()}-${invoice.month.toString().padStart(2,'0')}${invoice.year}`;

    // Build PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${monthName}-${invoice.year}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENT RECEIPT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(propertyName, { align: 'center' });
    if (propertyAddress) doc.text(propertyAddress, { align: 'center' });
    doc.moveDown(0.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);

    // Receipt meta
    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    const metaY = doc.y;
    doc.text(`Receipt No: ${receiptNo}`, 50, metaY);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });
    doc.moveDown(1);

    // Body
    doc.fontSize(11).font('Helvetica')
      .text('Received with thanks from ', { continued: true })
      .font('Helvetica-Bold').text(tenantName);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('The sum of ', { continued: true })
      .font('Helvetica-Bold').text(`₹ ${totalPaid.toLocaleString('en-IN')}`, { continued: true })
      .font('Helvetica').text(` (${amountInWords(totalPaid)} Rupees Only)`);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('Towards rent for ', { continued: true })
      .font('Helvetica-Bold').text(`${monthName} ${invoice.year}`);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('Accommodation: ', { continued: true })
      .font('Helvetica-Bold').text(`${propertyName}, Room ${roomNo}, Bed ${bedLabel}`);

    doc.moveDown(1);

    // Payments table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555').text('PAYMENT DETAILS');
    doc.moveDown(0.3);

    // Table header
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Date', 50, doc.y, { width: 120 });
    doc.text('Mode', 170, doc.y - doc.currentLineHeight(), { width: 100 });
    doc.text('Amount', 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);

    invoice.payments.forEach((p) => {
      const pDate = new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(pDate, 50, rowY, { width: 120 });
      doc.text(p.mode, 170, rowY, { width: 100 });
      doc.text(`₹ ${Number(p.amount).toLocaleString('en-IN')}`, 400, rowY, { width: 145, align: 'right' });
      doc.moveDown(0.5);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Total Paid:', 50, doc.y, { width: 300 });
    doc.text(`₹ ${totalPaid.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(2);

    // Revenue stamp note
    if (totalPaid > 5000) {
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text('* A ₹1 revenue stamp is affixed on the original receipt as required for amounts exceeding ₹5,000.', { align: 'center' });
      doc.moveDown(0.5);
    }

    // Footer
    doc.fontSize(8).fillColor('#aaaaaa')
      .text('This is a computer-generated receipt and does not require a physical signature.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[receipt]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to generate receipt' });
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
      include: { tenant: { include: { user: { select: { name: true, phone: true } } } } },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const phone = invoice.tenant.user.phone;
    if (!phone) return res.status(400).json({ success: false, error: 'Tenant has no phone number' });

    const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
    const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)));

    const ok = await sendOverdueReminder(phone, invoice.tenant.user.name, remaining, invoice.month, invoice.year, daysOverdue);
    if (!ok) return res.status(500).json({ success: false, error: 'WhatsApp send failed' });

    return res.json({ success: true, message: 'Reminder sent' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to send reminder' });
  }
});
