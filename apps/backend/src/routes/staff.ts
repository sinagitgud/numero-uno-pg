import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { opsOnly, ownerOnly } from '../middleware/rbac';

export const staffRoutes = Router();

// GET /api/staff
staffRoutes.get('/', authenticate, opsOnly, async (_req: AuthRequest, res: Response) => {
  const staff = await prisma.staff.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: staff });
});

// POST /api/staff
staffRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { name, role, salary, propertyId } = req.body;
  try {
    const member = await prisma.staff.create({ data: { name, role, salary, propertyId } });
    return res.status(201).json({ success: true, data: member });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create staff member' });
  }
});

// POST /api/staff/:id/salary — record monthly salary
staffRoutes.post('/:id/salary', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { month, year, daysWorked, advance } = req.body;
  try {
    const member = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ success: false, error: 'Staff not found' });

    const totalDays = new Date(year, month, 0).getDate();
    const payableSalary = (Number(member.salary) / totalDays) * daysWorked;
    const balance = payableSalary - (advance || 0);

    const record = await prisma.salaryRecord.create({
      data: {
        staffId: req.params.id, month, year, daysWorked,
        payableSalary, advance: advance || 0, balance,
      },
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Salary record already exists for this month' });
    return res.status(500).json({ success: false, error: 'Failed to create salary record' });
  }
});

// GET /api/staff/salary?month=&year=
staffRoutes.get('/salary', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;
  const records = await prisma.salaryRecord.findMany({
    where: {
      ...(month ? { month: Number(month) } : {}),
      ...(year ? { year: Number(year) } : {}),
    },
    include: { staff: true },
  });
  return res.json({ success: true, data: records });
});

// PATCH /api/staff/salary/:id — mark salary as paid
staffRoutes.patch('/salary/:id', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const record = await prisma.salaryRecord.update({
      where: { id: req.params.id },
      data: { status },
    });
    return res.json({ success: true, data: record });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update salary record' });
  }
});
