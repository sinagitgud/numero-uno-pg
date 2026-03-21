import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { opsOnly, staffOnly } from '../middleware/rbac';

export const expenseRoutes = Router();

// GET /api/expenses?propertyId=&category=&month=&year=
expenseRoutes.get('/', authenticate, opsOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, category, month, year } = req.query;

  let dateFilter = {};
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    dateFilter = { date: { gte: start, lt: end } };
  }

  const expenses = await prisma.expense.findMany({
    where: {
      ...(propertyId ? { propertyId: String(propertyId) } : {}),
      ...(category ? { category: String(category) as any } : {}),
      ...dateFilter,
    },
    include: { property: { select: { name: true, code: true } } },
    orderBy: { date: 'desc' },
  });
  return res.json({ success: true, data: expenses });
});

// POST /api/expenses — log a new expense
expenseRoutes.post('/', authenticate, opsOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, date, amount, category, subCategory, paidBy, mode, notes, receiptUrl } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        propertyId: propertyId || null,
        date: new Date(date), amount, category, subCategory,
        paidBy: paidBy || req.user!.name,
        mode, notes, receiptUrl,
      },
    });
    return res.status(201).json({ success: true, data: expense });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create expense' });
  }
});

// PATCH /api/expenses/:id
expenseRoutes.patch('/:id', authenticate, opsOnly, async (req: AuthRequest, res: Response) => {
  const { amount, category, subCategory, paidBy, mode, notes, receiptUrl } = req.body;
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { amount, category, subCategory, paidBy, mode, notes, receiptUrl },
    });
    return res.json({ success: true, data: expense });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
expenseRoutes.delete('/:id', authenticate, opsOnly, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Expense deleted' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});
