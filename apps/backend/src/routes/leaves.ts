import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, tenantOnly } from '../middleware/rbac';

export const leaveRoutes = Router();

const VALID_LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
type LeaveStatus = typeof VALID_LEAVE_STATUSES[number];

// GET /api/leaves — staff views all leave requests
leaveRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, status, page = '1', limit = '20' } = req.query;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const statusFilter = status && VALID_LEAVE_STATUSES.includes(String(status) as LeaveStatus)
    ? { status: String(status) as LeaveStatus }
    : {};

  const where = {
    ...statusFilter,
    ...(propertyId ? { tenant: { propertyId: String(propertyId) } } : {}),
  };

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        tenant: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  return res.json({ success: true, data: leaves, total, page: Number(page), pages: Math.ceil(total / take) });
});

// GET /api/leaves/me — tenant views their own leave requests
leaveRoutes.get('/me', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });

  const leaves = await prisma.leaveRequest.findMany({
    where: { tenantId: tenant.id },
    orderBy: { fromDate: 'desc' },
    take: 20,
  });
  return res.json({ success: true, data: leaves });
});

// POST /api/leaves — tenant submits a leave request
leaveRoutes.post('/', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const { fromDate, toDate, reason } = req.body;
  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, error: 'fromDate and toDate are required' });
  }
  const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });

  const leave = await prisma.leaveRequest.create({
    data: {
      tenantId: tenant.id,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason: reason || null,
    },
  });
  return res.status(201).json({ success: true, data: leave });
});

// PATCH /api/leaves/:id — staff approves or rejects
leaveRoutes.patch('/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be APPROVED or REJECTED' });
  }
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        approvedBy: req.user!.id,
        approvedAt: new Date(),
      },
    });
    return res.json({ success: true, data: leave });
  } catch {
    return res.status(404).json({ success: false, error: 'Leave request not found' });
  }
});
