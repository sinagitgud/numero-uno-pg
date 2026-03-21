import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, ownerOnly } from '../middleware/rbac';

export const propertyRoutes = Router();

// GET /api/properties — list all properties
propertyRoutes.get('/', authenticate, staffOnly, async (_req: AuthRequest, res: Response) => {
  const properties = await prisma.property.findMany({
    where: { isActive: true },
    include: {
      rooms: { include: { beds: true } },
      _count: { select: { tenants: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: properties });
});

// GET /api/properties/:id
propertyRoutes.get('/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: { rooms: { include: { beds: { include: { tenant: { include: { user: true } } } } } } },
  });
  if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
  return res.json({ success: true, data: property });
});

// POST /api/properties — create (owner only)
propertyRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { name, code, type, ownership, address, wifiDetails, houseRules, mealSchedule } = req.body;
  try {
    const property = await prisma.property.create({
      data: { name, code, type, ownership, address, wifiDetails, houseRules, mealSchedule },
    });
    return res.status(201).json({ success: true, data: property });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Property code already exists' });
    return res.status(500).json({ success: false, error: 'Failed to create property' });
  }
});

// PATCH /api/properties/:id — update (owner only)
propertyRoutes.patch('/:id', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { name, address, wifiDetails, houseRules, mealSchedule } = req.body;
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: { name, address, wifiDetails, houseRules, mealSchedule },
    });
    return res.json({ success: true, data: property });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update property' });
  }
});
