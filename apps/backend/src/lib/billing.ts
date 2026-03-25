import { prisma } from './prisma';

/**
 * Calculate pro-rata rent for the first (partial) month.
 * If tenant joins on the 1st, full month is charged.
 * Formula: (daysRemainingInMonth / totalDaysInMonth) × monthlyRate
 */
export function calcProRataAmount(joinDate: Date, monthlyRate: number): number {
  const day = joinDate.getDate();
  const month = joinDate.getMonth();
  const year = joinDate.getFullYear();
  const totalDays = new Date(year, month + 1, 0).getDate();
  if (day === 1) return monthlyRate;
  const daysRemaining = totalDays - day + 1;
  return Math.round((monthlyRate / totalDays) * daysRemaining);
}

/**
 * Create the first (pro-rata) invoice for a newly onboarded tenant.
 */
export async function createFirstInvoice(
  tenantId: string,
  joinDate: Date,
  monthlyRate: number,
  discount = 0,
) {
  const month = joinDate.getMonth() + 1;
  const year = joinDate.getFullYear();
  const amountDue = calcProRataAmount(joinDate, monthlyRate - discount);

  // Due on 5th of the month; if join date is after 5th, due at end of month
  const fiveths = new Date(year, month - 1, 5);
  const dueDate = joinDate <= fiveths ? fiveths : new Date(year, month, 0);

  return prisma.invoice.create({
    data: { tenantId, month, year, amountDue, dueDate },
  });
}

/**
 * Generate monthly invoices for all active tenants.
 * Skips tenants who already have an invoice for that month.
 * Returns count of newly created invoices.
 */
export async function generateMonthlyInvoices(month: number, year: number): Promise<number> {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    include: { invoices: { where: { month, year } } },
  });

  const dueDate = new Date(year, month - 1, 5);
  let created = 0;

  for (const tenant of tenants) {
    if (tenant.invoices.length > 0) continue;
    const rate = Number(tenant.rate);
    const discount = Number(tenant.discount ?? 0);
    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        month,
        year,
        amountDue: Math.max(0, rate - discount),
        dueDate,
      },
    });
    created++;
  }

  return created;
}
