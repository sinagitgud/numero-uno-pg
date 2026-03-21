import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly, tenantOnly } from '../middleware/rbac';

export const invoiceRoutes = Router();

// GET /api/invoices?tenantId=&month=&year=
invoiceRoutes.get('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { tenantId, month, year, status } = req.query;
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(tenantId ? { tenantId: String(tenantId) } : {}),
      ...(month ? { month: Number(month) } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(status ? { status: String(status) as any } : {}),
    },
    include: {
      tenant: { include: { user: { select: { name: true, phone: true } } } },
      payments: true,
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return res.json({ success: true, data: invoices });
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

// POST /api/invoices — manually create invoice (pro-rata or full month)
invoiceRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { tenantId, month, year, amountDue, dueDate, notes } = req.body;
  try {
    const invoice = await prisma.invoice.create({
      data: {
        tenantId, month: Number(month), year: Number(year),
        amountDue, dueDate: new Date(dueDate), notes,
      },
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Invoice already exists for this tenant/month/year' });
    return res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});
