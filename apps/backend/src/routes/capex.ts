import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ownerOnly } from '../middleware/rbac';

export const capexRoutes = Router();

capexRoutes.get('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, year } = req.query;
  let dateFilter = {};
  if (year) {
    dateFilter = { date: { gte: new Date(`${year}-01-01`), lt: new Date(`${Number(year) + 1}-01-01`) } };
  }
  const items = await prisma.capex.findMany({
    where: {
      ...(propertyId ? { propertyId: String(propertyId) } : {}),
      ...dateFilter,
    },
    include: { property: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });
  return res.json({ success: true, data: items });
});

capexRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, category, item, amount, date, notes } = req.body;
  try {
    const capex = await prisma.capex.create({
      data: { propertyId, category, item, amount, date: new Date(date), notes },
    });
    return res.status(201).json({ success: true, data: capex });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create capex entry' });
  }
});
