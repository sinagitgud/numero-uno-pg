/**
 * Gupshup WhatsApp Notification Service
 *
 * Activates when GUPSHUP_API_KEY, GUPSHUP_APP_NAME, GUPSHUP_SOURCE_NUMBER are real values.
 * Falls back to console.log stub in dev mode.
 *
 * Setup: https://www.gupshup.io → WhatsApp → Create App
 * Source number is the WhatsApp business number Gupshup provides.
 */

const isGupshupConfigured =
  process.env.GUPSHUP_API_KEY &&
  !process.env.GUPSHUP_API_KEY.startsWith('REPLACE') &&
  process.env.GUPSHUP_SOURCE_NUMBER &&
  !process.env.GUPSHUP_SOURCE_NUMBER.startsWith('REPLACE');

export const gupshupAvailable = !!isGupshupConfigured;

if (isGupshupConfigured) {
  console.log('✅ Gupshup WhatsApp configured — notifications active');
} else {
  console.warn('⚠️  Gupshup not configured — WhatsApp notifications in dev mode (console only)');
}

/**
 * Sends a WhatsApp text message via Gupshup.
 * phone: Indian number without +91, e.g. "9871608064"
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const normalised = phone.replace(/^\+91/, '').replace(/\D/g, '');

  if (!isGupshupConfigured) {
    console.log(`[WhatsApp dev] → ${normalised}: ${message}`);
    return true;
  }

  try {
    const params = new URLSearchParams({
      type: 'text',
      destination: `91${normalised}`,
      source: process.env.GUPSHUP_SOURCE_NUMBER!,
      message,
      'src.name': process.env.GUPSHUP_APP_NAME!,
    });

    const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: {
        'apikey': process.env.GUPSHUP_API_KEY!,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error('[Gupshup] Send failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Gupshup] Error:', err);
    return false;
  }
}

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Rent due reminder (sent D-3 before due date = 2nd of month) */
export async function sendRentReminder(
  phone: string, name: string, amount: number, month: number, year: number
): Promise<boolean> {
  const msg =
    `Hi ${name}! Your rent for ${MONTHS[month]} ${year} is ₹${amount.toLocaleString('en-IN')}. ` +
    `It is due on 5th ${MONTHS[month]}. Please pay on time to avoid a late fee. ` +
    `— Numero Uno PG Management`;
  return sendWhatsApp(phone, msg);
}

/** Payment receipt confirmation */
export async function sendPaymentReceipt(
  phone: string, name: string, amount: number, month: number, year: number, mode: string
): Promise<boolean> {
  const msg =
    `Hi ${name}! We have received your rent payment of ₹${amount.toLocaleString('en-IN')} ` +
    `for ${MONTHS[month]} ${year} via ${mode}. Thank you! ` +
    `— Numero Uno PG Management`;
  return sendWhatsApp(phone, msg);
}

/** Overdue follow-up (sent on 10th of month for unpaid invoices) */
export async function sendOverdueReminder(
  phone: string, name: string, amount: number, month: number, year: number, daysOverdue: number
): Promise<boolean> {
  const msg =
    `Hi ${name}! Your rent of ₹${amount.toLocaleString('en-IN')} for ${MONTHS[month]} ${year} ` +
    `is ${daysOverdue} days overdue. Please pay immediately to avoid action. ` +
    `Contact management if you have any issues. — Numero Uno PG`;
  return sendWhatsApp(phone, msg);
}

/** Welcome message when a new tenant is onboarded */
export async function sendWelcomeMessage(
  phone: string, name: string, propertyName: string, room: string, bed: string
): Promise<boolean> {
  const msg =
    `Welcome to Numero Uno PG, ${name}! 🏠\n` +
    `Your room: ${propertyName} · ${room} · Bed ${bed}\n` +
    `Download our app to view your invoices, pay rent, and raise requests.\n` +
    `— Numero Uno PG Management`;
  return sendWhatsApp(phone, msg);
}
