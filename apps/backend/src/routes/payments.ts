import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly } from '../middleware/rbac';

export const paymentRoutes = Router();

// POST /api/payments — record a manual payment (cash, bank transfer, etc.)
paymentRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { invoiceId, amount, date, mode, notes } = req.body;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const totalPaid = Number(invoice.amountPaid) + Number(amount);
    const newStatus = totalPaid >= Number(invoice.amountDue) ? 'PAID'
      : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId, amount, date: new Date(date), mode,
          recordedBy: req.user!.id, notes,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: totalPaid, status: newStatus },
      }),
    ]);

    return res.status(201).json({ success: true, data: payment });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// POST /api/payments/razorpay-webhook — Razorpay payment confirmation (Phase 4)
paymentRoutes.post('/razorpay-webhook', async (req, res) => {
  // TODO: Implement Razorpay webhook verification and auto-reconciliation (Phase 4)
  res.json({ success: true });
});
