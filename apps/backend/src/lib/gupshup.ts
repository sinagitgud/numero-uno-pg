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
 * phone: Indian number with or without +91
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

/**
 * Sends a WhatsApp image message with caption via Gupshup.
 * Falls back to text-only if imageUrl is missing.
 */
export async function sendWhatsAppImage(
  phone: string,
  imageUrl: string,
  caption: string,
): Promise<boolean> {
  const normalised = phone.replace(/^\+91/, '').replace(/\D/g, '');

  if (!isGupshupConfigured) {
    console.log(`[WhatsApp dev image] → ${normalised}: [image: ${imageUrl}] ${caption}`);
    return true;
  }

  try {
    const params = new URLSearchParams({
      type: 'image',
      destination: `91${normalised}`,
      source: process.env.GUPSHUP_SOURCE_NUMBER!,
      message: JSON.stringify({ type: 'image', originalUrl: imageUrl, caption }),
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
      console.error('[Gupshup] Image send failed:', res.status, await res.text());
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

/**
 * Rent due reminder with UPI QR code image.
 * If qrImageUrl is provided, sends QR as image + caption.
 * Otherwise sends text-only reminder.
 */
export async function sendRentReminder(
  phone: string, name: string, amount: number, month: number, year: number,
  qrImageUrl?: string | null,
): Promise<boolean> {
  const caption =
    `Hi ${name}! Your rent for ${MONTHS[month]} ${year} is ₹${amount.toLocaleString('en-IN')}. ` +
    `It is due on 5th ${MONTHS[month]}. Please scan the QR code to pay via UPI, then mark as paid in the app. ` +
    `— Numero Uno PG`;

  if (qrImageUrl) {
    return sendWhatsAppImage(phone, qrImageUrl, caption);
  }
  return sendWhatsApp(phone, caption);
}

/** Payment receipt confirmation */
export async function sendPaymentReceipt(
  phone: string, name: string, amount: number, month: number, year: number, mode: string
): Promise<boolean> {
  const msg =
    `Hi ${name}! Your rent payment of ₹${amount.toLocaleString('en-IN')} ` +
    `for ${MONTHS[month]} ${year} via ${mode} has been approved. Thank you! ` +
    `— Numero Uno PG Management`;
  return sendWhatsApp(phone, msg);
}

/** Overdue follow-up with UPI QR code image */
export async function sendOverdueReminder(
  phone: string, name: string, amount: number, month: number, year: number,
  daysOverdue: number, qrImageUrl?: string | null,
): Promise<boolean> {
  const caption =
    `Hi ${name}! Your rent of ₹${amount.toLocaleString('en-IN')} for ${MONTHS[month]} ${year} ` +
    `is ${daysOverdue} days overdue. Please pay immediately using the QR code and mark as paid in the app. ` +
    `— Numero Uno PG`;

  if (qrImageUrl) {
    return sendWhatsAppImage(phone, qrImageUrl, caption);
  }
  return sendWhatsApp(phone, caption);
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