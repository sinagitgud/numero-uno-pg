import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly } from '../middleware/rbac';

export const entryExitRoutes = Router();

// GET /api/entry-exit?propertyId=&date=&tenantId=
entryExitRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, date, tenantId, page = '1', limit = '50' } = req.query;
  const take = Math.min(Number(limit) || 50, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  let dateFilter = {};
  if (date) {
    const dayStart = new Date(String(date));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    dateFilter = { loggedAt: { gte: dayStart, lt: dayEnd } };
  }

  const where = {
    ...(propertyId ? { propertyId: String(propertyId) } : {}),
    ...(tenantId ? { tenantId: String(tenantId) } : {}),
    ...dateFilter,
  };

  const [logs, total] = await Promise.all([
    prisma.entryExitLog.findMany({
      where,
      include: {
        tenant: { include: { user: { select: { name: true } }, bed: { include: { room: { select: { number: true } } } } } },
        logger: { select: { name: true } },
      },
      orderBy: { loggedAt: 'desc' },
      take,
      skip,
    }),
    prisma.entryExitLog.count({ where }),
  ]);

  return res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / take) });
});

// POST /api/entry-exit — staff logs a tenant entry or exit
entryExitRoutes.post('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { tenantId, direction, notes } = req.body;

  if (!tenantId || !direction || !['IN', 'OUT'].includes(direction)) {
    return res.status(400).json({ success: false, error: 'tenantId and direction (IN/OUT) are required' });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { propertyId: true, status: true },
  });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });
  if (tenant.status === 'VACATED') {
    return res.status(400).json({ success: false, error: 'Cannot log entry for vacated tenant' });
  }

  const log = await prisma.entryExitLog.create({
    data: {
      tenantId,
      propertyId: tenant.propertyId,
      direction,
      loggedBy: req.user!.id,
      notes: notes || null,
    },
    include: {
      tenant: { include: { user: { select: { name: true } } } },
    },
  });

  return res.status(201).json({ success: true, data: log });
});
