import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly } from '../middleware/rbac';

export const menuRoutes = Router();

// GET /api/menu/:propertyId — anyone authenticated can view the menu
menuRoutes.get('/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  const items = await prisma.foodMenuItem.findMany({
    where: { propertyId: req.params.propertyId },
    orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
  });
  return res.json({ success: true, data: items });
});

// PUT /api/menu/:propertyId — staff upserts menu items (full replace for the day+meal slot)
// Body: [{ dayOfWeek, mealType, items }]
menuRoutes.put('/:propertyId', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId } = req.params;
  const entries: { dayOfWeek: string; mealType: string; items: string }[] = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, error: 'Body must be a non-empty array of menu entries' });
  }

  try {
    const results = await Promise.all(
      entries.map((e) =>
        prisma.foodMenuItem.upsert({
          where: {
            propertyId_dayOfWeek_mealType: {
              propertyId,
              dayOfWeek: e.dayOfWeek as any,
              mealType: e.mealType as any,
            },
          },
          create: {
            propertyId,
            dayOfWeek: e.dayOfWeek as any,
            mealType: e.mealType as any,
            items: e.items,
          },
          update: { items: e.items },
        }),
      ),
    );
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[menu]', err);
    return res.status(500).json({ success: false, error: 'Failed to update menu' });
  }
});

// DELETE /api/menu/:propertyId/:id — remove a single slot
menuRoutes.delete('/:propertyId/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.foodMenuItem.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch {
    return res.status(404).json({ success: false, error: 'Menu item not found' });
  }
});
