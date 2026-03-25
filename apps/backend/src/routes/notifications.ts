/**
 * Notifications Routes
 *
 * Manual triggers for WhatsApp notifications — useful for testing
 * and for the owner to send ad-hoc reminders from the dashboard.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ownerOnly } from '../middleware/rbac';
import { sendBatchRentReminders } from '../lib/cron';
import { sendPaymentReceipt, sendWelcomeMessage, gupshupAvailable } from '../lib/gupshup';

export const notificationRoutes = Router();

/**
 * GET /api/notifications/status
 * Returns whether WhatsApp / Razorpay are active.
 */
notificationRoutes.get('/status', authenticate, async (_req: AuthRequest, res: Response) => {
  const { razorpayAvailable } = await import('../lib/razorpay');
  return res.json({
    success: true,
    data: {
      whatsapp: gupshupAvailable,
      razorpay: razorpayAvailable,
    },
  });
});

/**
 * POST /api/notifications/send-reminders
 * Owner manually triggers rent reminders for a given month/year.
 * Body: { month, year, type: 'D3' | 'OVERDUE' }
 */
notificationRoutes.post('/send-reminders', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  const month = Number(req.body.month) || new Date().getMonth() + 1;
  const year = Number(req.body.year) || new Date().getFullYear();
  const type = (req.body.type as 'D3' | 'OVERDUE') || 'D3';

  try {
    const result = await sendBatchRentReminders(month, year, type);
    return res.json({
      success: true,
      data: { ...result, month, year, type, whatsappActive: gupshupAvailable },
    });
  } catch (err) {
    console.error('[notifications/send-reminders]', err);
    return res.status(500).json({ success: false, error: 'Failed to send reminders' });
  }
});

/**
 * POST /api/notifications/receipt/:paymentId
 * Sends a payment receipt WhatsApp to the tenant for a given payment.
 */
notificationRoutes.post('/receipt/:paymentId', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: {
        invoice: {
          include: {
            tenant: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
      },
    });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const { name, phone } = payment.invoice.tenant.user;
    if (!phone) return res.status(400).json({ success: false, error: 'Tenant has no phone number' });

    const ok = await sendPaymentReceipt(
      phone, name, Number(payment.amount),
      payment.invoice.month, payment.invoice.year,
      payment.mode
    );

    return res.json({ success: true, data: { sent: ok, whatsappActive: gupshupAvailable } });
  } catch (err) {
    console.error('[notifications/receipt]', err);
    return res.status(500).json({ success: false, error: 'Failed to send receipt' });
  }
});

/**
 * POST /api/notifications/welcome/:tenantId
 * Sends a welcome WhatsApp to a newly onboarded tenant.
 */
notificationRoutes.post('/welcome/:tenantId', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.tenantId },
      include: {
        user: { select: { name: true, phone: true } },
        bed: { include: { room: { include: { property: { select: { name: true } } } } } },
      },
    });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const { name, phone } = tenant.user;
    if (!phone) return res.status(400).json({ success: false, error: 'No phone number' });

    const ok = await sendWelcomeMessage(
      phone, name,
      tenant.bed.room.property.name,
      tenant.bed.room.number,
      tenant.bed.label,
    );

    return res.json({ success: true, data: { sent: ok, whatsappActive: gupshupAvailable } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to send welcome message' });
  }
});
