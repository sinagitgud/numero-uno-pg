import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, tenantOnly } from '../middleware/rbac';

export const guestRoutes = Router();

// GET /api/guests — staff lists all guests for a property
guestRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, date, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  let dateFilter = {};
  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(String(dateFrom)) : undefined;
    const to = dateTo ? new Date(new Date(String(dateTo)).getTime() + 24 * 60 * 60 * 1000) : undefined;
    dateFilter = { expectedIn: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } };
  } else if (date) {
    const dateStr = String(date);
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const dayStart = new Date(new Date(dateStr).getTime() + IST_OFFSET_MS);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    dateFilter = { expectedIn: { gte: dayStart, lt: dayEnd } };
  }

  const where = {
    ...(propertyId ? { propertyId: String(propertyId) } : {}),
    ...dateFilter,
  };

  const [guests, total] = await Promise.all([
    prisma.guestLog.findMany({
      where,
      include: {
        tenant: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { expectedIn: 'desc' },
      take,
      skip,
    }),
    prisma.guestLog.count({ where }),
  ]);
  return res.json({ success: true, data: guests, total, page: Number(page), pages: Math.ceil(total / take) });
});

// GET /api/guests/me — tenant views their own guest log
guestRoutes.get('/me', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });

  const guests = await prisma.guestLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { expectedIn: 'desc' },
    take: 30,
  });
  return res.json({ success: true, data: guests });
});

// POST /api/guests — tenant registers a visitor
guestRoutes.post('/', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const { visitorName, visitorPhone, expectedIn, expectedOut, notes } = req.body;
  if (!visitorName || !expectedIn) {
    return res.status(400).json({ success: false, error: 'visitorName and expectedIn are required' });
  }
  const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });

  const guest = await prisma.guestLog.create({
    data: {
      tenantId: tenant.id,
      propertyId: tenant.propertyId,
      visitorName,
      visitorPhone: visitorPhone || null,
      expectedIn: new Date(expectedIn),
      expectedOut: expectedOut ? new Date(expectedOut) : null,
      notes: notes || null,
    },
  });
  return res.status(201).json({ success: true, data: guest });
});

// PATCH /api/guests/:id/checkout — staff marks visitor as checked out
guestRoutes.patch('/:id/checkout', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  try {
    const guest = await prisma.guestLog.update({
      where: { id: req.params.id },
      data: { actualOut: new Date() },
    });
    return res.json({ success: true, data: guest });
  } catch {
    return res.status(404).json({ success: false, error: 'Guest log not found' });
  }
});
