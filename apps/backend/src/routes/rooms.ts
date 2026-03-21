import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, ownerOnly } from '../middleware/rbac';

export const roomRoutes = Router();

// GET /api/rooms?propertyId=xxx
roomRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId } = req.query;
  const rooms = await prisma.room.findMany({
    where: { ...(propertyId ? { propertyId: String(propertyId) } : {}) },
    include: { beds: { include: { tenant: { include: { user: { select: { name: true } } } } } } },
    orderBy: { number: 'asc' },
  });
  return res.json({ success: true, data: rooms });
});

// POST /api/rooms — create room
roomRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, number, capacity, isAc, rateMin, rateMax } = req.body;
  try {
    const room = await prisma.room.create({
      data: { propertyId, number, capacity, isAc: isAc ?? false, rateMin, rateMax },
      include: { beds: true },
    });
    return res.status(201).json({ success: true, data: room });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Room number already exists in this property' });
    return res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

// POST /api/rooms/:id/beds — add a bed to a room
roomRoutes.post('/:id/beds', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { label } = req.body;
  try {
    const bed = await prisma.bed.create({ data: { roomId: req.params.id, label } });
    return res.status(201).json({ success: true, data: bed });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Bed label already exists in this room' });
    return res.status(500).json({ success: false, error: 'Failed to create bed' });
  }
});

// PATCH /api/rooms/:id
roomRoutes.patch('/:id', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { number, capacity, isAc, rateMin, rateMax } = req.body;
  try {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { number, capacity, isAc, rateMin, rateMax },
    });
    return res.json({ success: true, data: room });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update room' });
  }
});
