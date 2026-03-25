import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly } from '../middleware/rbac';
import { sendPush } from '../lib/push';

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

const VALID_TICKET_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const VALID_TICKET_CATEGORIES = ['MAINTENANCE', 'FOOD', 'CLEANLINESS', 'WIFI', 'ROOMMATE', 'BILLING', 'GENERAL'];

// GET /api/tickets — filtered by role
ticketRoutes.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { status, propertyId, page = '1', limit = '20' } = req.query;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  const role = req.user!.role;

  const statusFilter = status && VALID_TICKET_STATUSES.includes(String(status))
    ? { status: String(status) as any }
    : {};

  // Category filters per role — typed properly
  const SALES_CATS = ['BILLING', 'GENERAL'] as const;
  const OPS_CATS = ['MAINTENANCE', 'FOOD', 'CLEANLINESS', 'WIFI', 'ROOMMATE', 'GENERAL'] as const;
  let categoryFilter: object = {};
  if (role === 'SALES_MANAGER') categoryFilter = { category: { in: SALES_CATS } };
  if (role === 'OPS_MANAGER') categoryFilter = { category: { in: OPS_CATS } };

  if (role === 'TENANT') {
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { tenantId: tenant.id, ...statusFilter },
        include: { comments: { include: { user: { select: { name: true, role: true } } } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.supportTicket.count({ where: { tenantId: tenant.id, ...statusFilter } }),
    ]);
    return res.json({ success: true, data: tickets, total, page: Number(page), pages: Math.ceil(total / take) });
  }

  const where = {
    ...categoryFilter,
    ...statusFilter,
    ...(propertyId ? { propertyId: String(propertyId) } : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        tenant: { include: { user: { select: { name: true } } } },
        comments: { include: { user: { select: { name: true, role: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return res.json({ success: true, data: tickets, total, page: Number(page), pages: Math.ceil(total / take) });
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

    // Auto-assign to correct manager role, falling back to OWNER if none found
    const assignedRole = CATEGORY_ASSIGNEE[category] || 'OWNER';
    let assignedManager = await prisma.user.findFirst({
      where: { role: assignedRole as any, isActive: true },
      select: { id: true },
    });
    if (!assignedManager && assignedRole !== 'OWNER') {
      assignedManager = await prisma.user.findFirst({
        where: { role: 'OWNER', isActive: true },
        select: { id: true },
      });
    }

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
      include: { tenant: { include: { user: { select: { fcmToken: true, name: true } } } } },
    });

    // Push notification to tenant
    const fcmToken = ticket.tenant?.user?.fcmToken;
    if (fcmToken) {
      const statusLabel: Record<string, string> = {
        ACKNOWLEDGED: 'acknowledged',
        IN_PROGRESS: 'in progress',
        RESOLVED: 'resolved',
        CLOSED: 'closed',
      };
      sendPush(fcmToken, {
        title: 'Ticket Update',
        body: `Your support request has been ${statusLabel[status] ?? status.toLowerCase()}.`,
        data: { ticketId: ticket.id, screen: 'support' },
      }).catch(() => {});
    }

    return res.json({ success: true, data: ticket });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

// POST /api/tickets/:id/comments — add comment
ticketRoutes.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  try {
    // Tenants may only comment on their own tickets
    if (req.user!.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
      if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });
      const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
      if (!ticket || ticket.tenantId !== tenant.id) {
        return res.status(403).json({ success: false, error: 'Not authorised to comment on this ticket' });
      }
    }

    const comment = await prisma.ticketComment.create({
      data: { ticketId: req.params.id, userId: req.user!.id, message },
      include: { user: { select: { name: true, role: true } } },
    });
    return res.status(201).json({ success: true, data: comment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});
