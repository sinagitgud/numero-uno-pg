/**
 * Cron Jobs — Automated Scheduled Tasks
 *
 * Uses node-cron (already installed).
 * Call startCronJobs() once from index.ts.
 *
 * Schedule overview:
 *   1st of month @ 8:00 AM  → Generate monthly invoices for all active tenants
 *   2nd of month @ 9:00 AM  → Send D-3 rent reminders via WhatsApp (due 5th)
 *   10th of month @ 10:00 AM → Send overdue reminders for still-unpaid invoices
 */

import cron from 'node-cron';
import { prisma } from './prisma';
import { generateMonthlyInvoices } from './billing';
import { sendRentReminder, sendOverdueReminder, sendWhatsApp } from './gupshup';
import { sendPush } from './push';

export function startCronJobs() {
  // ── Job 1: Monthly invoice generation ──────────────────────────────────────
  // Runs on the 1st of every month at 8:00 AM
  cron.schedule('0 8 1 * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    console.log(`[Cron] Generating invoices for ${month}/${year}...`);
    try {
      const created = await generateMonthlyInvoices(month, year);
      console.log(`[Cron] Generated ${created} invoice(s) for ${month}/${year}`);
      // Push notifications to all active tenants who just got an invoice
      if (created > 0) {
        const tenants = await prisma.tenant.findMany({
          where: { status: 'ACTIVE' },
          include: { user: { select: { fcmToken: true } } },
        });
        const tokens = tenants.map(t => t.user.fcmToken).filter(Boolean) as string[];
        await Promise.all(tokens.map(tok => sendPush(tok, {
          title: 'Rent Invoice Ready',
          body: `Your rent invoice for ${month}/${year} has been generated. Due by the 5th.`,
          data: { screen: 'rent' },
        }).catch(() => {})));
      }
    } catch (err) {
      console.error('[Cron] Invoice generation failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Job 2: D-3 rent reminders ───────────────────────────────────────────────
  // Runs on the 2nd of every month at 9:00 AM (rent is due on the 5th)
  cron.schedule('0 9 2 * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    console.log(`[Cron] Sending D-3 rent reminders for ${month}/${year}...`);
    try {
      await sendBatchRentReminders(month, year, 'D3');
    } catch (err) {
      console.error('[Cron] D-3 reminders failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Job 3: Overdue follow-up ────────────────────────────────────────────────
  // Runs on the 10th of every month at 10:00 AM (5 days overdue)
  cron.schedule('0 10 10 * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    console.log(`[Cron] Sending overdue reminders for ${month}/${year}...`);
    try {
      await sendBatchRentReminders(month, year, 'OVERDUE');
    } catch (err) {
      console.error('[Cron] Overdue reminders failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Job 4: D22 — Daily digest to OWNER @ 9:00 AM ───────────────────────────
  // Beds occupied/vacant, yesterday's collections, overdue count + dashboard link
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Sending daily digest to owner...');
    try {
      await sendDailyDigest();
    } catch (err) {
      console.error('[Cron] Daily digest failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs scheduled (IST): invoice gen 1st@8AM, reminders 2nd@9AM, overdue 10th@10AM, digest daily@9AM');
}

/**
 * D22: Sends a daily digest WhatsApp message to all OWNER-role users.
 * Reports: beds occupied/vacant, yesterday's collections, overdue count.
 */
async function sendDailyDigest(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [totalBeds, occupiedBeds, yesterdayPayments, overdueCount, owners] = await Promise.all([
    prisma.bed.count(),
    prisma.bed.count({ where: { status: 'OCCUPIED' } }),
    prisma.payment.aggregate({
      where: { date: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.count({
      where: { month: currentMonth, year: currentYear, status: 'OVERDUE' },
    }),
    prisma.user.findMany({
      where: { role: 'OWNER', isActive: true, phone: { not: null } },
      select: { phone: true, name: true },
    }),
  ]);

  const vacantBeds = totalBeds - occupiedBeds;
  const collected = yesterdayPayments._sum.amount || 0;
  const collectionCount = yesterdayPayments._count;

  const dashboardUrl = process.env.WEB_APP_URL || 'https://app.numerounopg.com';

  const message =
    `📊 *Daily Digest — Numero Uno*\n\n` +
    `🏠 Occupancy: ${occupiedBeds}/${totalBeds} beds (${vacantBeds} vacant)\n` +
    `💰 Yesterday's collections: ₹${collected.toLocaleString('en-IN')} (${collectionCount} payments)\n` +
    `⚠️ Overdue this month: ${overdueCount} invoices\n\n` +
    `🔗 ${dashboardUrl}/dashboard`;

  for (const owner of owners) {
    if (owner.phone) {
      await sendWhatsApp(owner.phone, message).catch(() => {});
    }
  }

  console.log(`[Cron/digest] Sent to ${owners.length} owner(s)`);
}

/**
 * Sends WhatsApp reminders to all tenants with a PENDING/PARTIAL invoice.
 * type = 'D3' (pre-due) or 'OVERDUE' (post-due)
 * Called by cron jobs and the manual /api/notifications/send-reminders endpoint.
 */
export async function sendBatchRentReminders(
  month: number, year: number, type: 'D3' | 'OVERDUE'
): Promise<{ sent: number; failed: number }> {
  const invoices = await prisma.invoice.findMany({
    where: { month, year, status: { in: ['PENDING', 'PARTIAL'] } },
    include: {
      tenant: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const inv of invoices) {
    const phone = inv.tenant.user.phone;
    if (!phone) { failed++; continue; }

    const remaining = Number(inv.amountDue) - Number(inv.amountPaid);
    const daysOverdue = Math.max(0, Math.floor(
      (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    ));

    let ok: boolean;
    if (type === 'D3') {
      ok = await sendRentReminder(phone, inv.tenant.user.name, remaining, month, year);
    } else {
      ok = await sendOverdueReminder(phone, inv.tenant.user.name, remaining, month, year, daysOverdue);
    }

    if (ok) sent++; else failed++;
  }

  console.log(`[Cron/reminders] ${type} — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}
