import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ownerOnly } from '../middleware/rbac';

export const dashboardRoutes = Router();

/**
 * GET /api/dashboard/snapshot
 * Owner home screen: today's collections, pending payments, occupancy, open tickets.
 */
dashboardRoutes.get('/snapshot', authenticate, ownerOnly, async (_req: AuthRequest, res: Response) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [
    todayPayments,
    pendingInvoices,
    openTickets,
    totalBeds,
    occupiedBeds,
  ] = await Promise.all([
    // Today's collections
    prisma.payment.aggregate({
      where: { date: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    // Pending/overdue invoices this month
    prisma.invoice.count({
      where: {
        month: currentMonth, year: currentYear,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
    }),
    // Open support tickets
    prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
    }),
    // Total beds
    prisma.bed.count(),
    // Occupied beds
    prisma.bed.count({ where: { status: 'OCCUPIED' } }),
  ]);

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return res.json({
    success: true,
    data: {
      todayCollections: {
        total: todayPayments._sum.amount || 0,
        count: todayPayments._count,
      },
      pendingPaymentsCount: pendingInvoices,
      openTicketsCount: openTickets,
      occupancy: { rate: occupancyRate, occupied: occupiedBeds, total: totalBeds },
    },
  });
});

/**
 * GET /api/dashboard/monthly?month=&year=
 * Full monthly report: revenue, collections, P&L, occupancy.
 */
dashboardRoutes.get('/monthly', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const [invoices, expenses, properties] = await Promise.all([
    prisma.invoice.findMany({
      where: { month, year },
      include: {
        payments: true,
        tenant: {
          include: {
            user: { select: { name: true } },
            bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
          },
        },
      },
    }),
    prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      include: { property: { select: { name: true } } },
    }),
    prisma.property.findMany({
      where: { isActive: true },
      include: {
        rooms: { include: { beds: { include: { tenant: { where: { status: 'ACTIVE' } } } } } },
      },
    }),
  ]);

  // Revenue summary
  const totalExpected = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Per-property breakdown
  const propertyRevenue: Record<string, number> = {};
  for (const inv of invoices) {
    const propertyName = inv.tenant.bed.room.property.name;
    propertyRevenue[propertyName] = (propertyRevenue[propertyName] || 0) + Number(inv.amountPaid);
  }

  // Receivables (pending/overdue)
  const receivables = invoices
    .filter(inv => inv.status !== 'PAID')
    .map(inv => ({
      tenantName: inv.tenant.user.name,
      property: inv.tenant.bed.room.property.name,
      amountDue: Number(inv.amountDue) - Number(inv.amountPaid),
      daysOverdue: Math.max(0, Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))),
      status: inv.status,
    }));

  return res.json({
    success: true,
    data: {
      month, year,
      revenue: {
        expected: totalExpected,
        collected: totalCollected,
        collectionRate,
        byProperty: propertyRevenue,
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenses.reduce((acc: Record<string, number>, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
          return acc;
        }, {}),
      },
      pnl: totalCollected - totalExpenses,
      receivables,
    },
  });
});
