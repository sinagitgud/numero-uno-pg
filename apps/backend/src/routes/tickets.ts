import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly } from '../middleware/rbac';

export const ticketRoutes = Router();

// Ticket category → auto-assigned manager role
const CATEGORY_ASSIGNEE: Record<string, string> = {
  MAINTENANCE: 'OPS_MANAGER',
  FOOD: 'OPS_MANAGER',
  CLEANLINESS: 'OPS_MANAGER',
  WIFI: 'OPS_MANAGER',
  ROOMMATE: 'OPS_MANAGER',
  BILLING: 'SALES_MANAGER',
  GENERAL: 'OWNER',
};

// GET /api/tickets — filtered by role
ticketRoutes.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { status, propertyId } = req.query;
  const role = req.user!.role;

  let categoryFilter = {};
  if (role === 'SALES_MANAGER') categoryFilter = { category: { in: ['BILLING', 'GENERAL'] as any } };
  if (role === 'OPS_MANAGER') categoryFilter = { category: { in: ['MAINTENANCE', 'FOOD', 'CLEANLINESS', 'WIFI', 'ROOMMATE', 'GENERAL'] as any } };
  if (role === 'TENANT') {
    // Tenant sees only their own tickets
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });
    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId: tenant.id, ...(status ? { status: String(status) as any } : {}) },
      include: { comments: { include: { user: { select: { name: true, role: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: tickets });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...categoryFilter,
      ...(status ? { status: String(status) as any } : {}),
      ...(propertyId ? { propertyId: String(propertyId) } : {}),
    },
    include: {
      tenant: { include: { user: { select: { name: true } } } },
      comments: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: tickets });
});

// POST /api/tickets — create ticket (tenant)
ticketRoutes.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'TENANT') {
    return res.status(403).json({ success: false, error: 'Only tenants can create tickets' });
  }

  const { category, description } = req.body;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.id },
      select: { id: true, propertyId: true },
    });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant record not found' });

    // Auto-assign to correct manager role
    const assignedRole = CATEGORY_ASSIGNEE[category] || 'OWNER';
    const assignedManager = await prisma.user.findFirst({
      where: { role: assignedRole as any, isActive: true },
      select: { id: true },
    });

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        category, description,
        assignedTo: assignedManager?.id,
      },
    });
    return res.status(201).json({ success: true, data: ticket });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// PATCH /api/tickets/:id/status — update ticket status (staff)
ticketRoutes.patch('/:id/status', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      },
    });
    return res.json({ success: true, data: ticket });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

// POST /api/tickets/:id/comments — add comment
ticketRoutes.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  try {
    const comment = await prisma.ticketComment.create({
      data: { ticketId: req.params.id, userId: req.user!.id, message },
      include: { user: { select: { name: true, role: true } } },
    });
    return res.status(201).json({ success: true, data: comment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});
