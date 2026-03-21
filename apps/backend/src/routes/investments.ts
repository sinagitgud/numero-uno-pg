import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ownerOnly } from '../middleware/rbac';

export const investmentRoutes = Router();

// Owner-only: list investments
investmentRoutes.get('/', authenticate, ownerOnly, async (_req: AuthRequest, res: Response) => {
  const investments = await prisma.investment.findMany({ orderBy: { date: 'desc' } });

  // Group by investor with running balance
  const summary: Record<string, { invested: number; returned: number; balance: number }> = {};
  for (const inv of investments) {
    if (!summary[inv.investorName]) summary[inv.investorName] = { invested: 0, returned: 0, balance: 0 };
    if (inv.type === 'INVESTMENT') {
      summary[inv.investorName].invested += Number(inv.amount);
      summary[inv.investorName].balance += Number(inv.amount);
    } else {
      summary[inv.investorName].returned += Number(inv.amount);
      summary[inv.investorName].balance -= Number(inv.amount);
    }
  }

  return res.json({ success: true, data: { investments, summary } });
});

investmentRoutes.post('/', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const { investorName, date, maturityMonth, maturityYear, amount, type, notes } = req.body;
  try {
    const investment = await prisma.investment.create({
      data: { investorName, date: new Date(date), maturityMonth, maturityYear, amount, type, notes },
    });
    return res.status(201).json({ success: true, data: investment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create investment record' });
  }
});
