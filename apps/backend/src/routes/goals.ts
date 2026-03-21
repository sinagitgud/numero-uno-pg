import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ownerOnly } from '../middleware/rbac';

export const goalRoutes = Router();

// GET /api/goals?month=&year=
goalRoutes.get('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query;
  const config = await prisma.goalConfig.findFirst({
    where: {
      ...(month ? { month: Number(month) } : {}),
      ...(year ? { year: Number(year) } : {}),
    },
  });
  return res.json({ success: true, data: config });
});

// POST /api/goals — create or update goal config for a month
goalRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { month, year, propertyTargets, baseSalary, incentiveTiers } = req.body;
  try {
    const config = await prisma.goalConfig.upsert({
      where: { month_year: { month, year } },
      create: { month, year, propertyTargets, baseSalary, incentiveTiers },
      update: { propertyTargets, baseSalary, incentiveTiers },
    });
    return res.json({ success: true, data: config });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to save goal config' });
  }
});

/**
 * GET /api/goals/incentive?month=&year=
 * Calculate Sales Manager incentive based on collection vs target.
 */
goalRoutes.get('/incentive', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const [config, invoices] = await Promise.all([
    prisma.goalConfig.findUnique({ where: { month_year: { month, year } } }),
    prisma.invoice.findMany({
      where: { month, year },
      select: { amountDue: true, amountPaid: true },
    }),
  ]);

  if (!config) return res.status(404).json({ success: false, error: 'No goal config for this month' });

  const totalExpected = Object.values(config.propertyTargets as Record<string, number>).reduce((a, b) => a + b, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const tiers = config.incentiveTiers as Array<{ minPercent: number; maxPercent: number; rate: number }>;
  const tier = tiers.find(t => collectionPct >= t.minPercent && collectionPct < t.maxPercent)
    || (collectionPct >= 100 ? tiers[tiers.length - 1] : tiers[0]);

  const incentive = (totalCollected * (tier?.rate || 0.01));
  const total = Number(config.baseSalary) + incentive;

  return res.json({
    success: true,
    data: {
      month, year,
      totalExpected, totalCollected,
      collectionPct: Math.round(collectionPct * 10) / 10,
      appliedTier: tier,
      incentive: Math.round(incentive),
      baseSalary: config.baseSalary,
      totalPayout: Math.round(total),
    },
  });
});
