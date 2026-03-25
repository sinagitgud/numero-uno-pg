/**
 * Razorpay Payment Links Service
 *
 * Activates when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are real values.
 * Falls back to dev stub otherwise.
 *
 * Setup: https://dashboard.razorpay.com → API Keys → Generate Test Key
 */

const isRazorpayConfigured =
  process.env.RAZORPAY_KEY_ID &&
  !process.env.RAZORPAY_KEY_ID.startsWith('REPLACE') &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_SECRET.startsWith('REPLACE');

export const razorpayAvailable = !!isRazorpayConfigured;

if (isRazorpayConfigured) {
  console.log('✅ Razorpay configured — payment links active');
} else {
  console.warn('⚠️  Razorpay not configured — payments running in dev mode');
}

/**
 * Creates a Razorpay Payment Link for an invoice.
 * Returns { id, short_url } — tenant opens short_url to pay.
 */
export async function createPaymentLink(opts: {
  invoiceId: string;
  amount: number; // in rupees
  tenantName: string;
  tenantPhone: string;
  description: string;
}): Promise<{ id: string; short_url: string }> {
  if (!isRazorpayConfigured) {
    // Dev stub — return a fake link
    console.log('[Razorpay dev] Payment link requested for invoice', opts.invoiceId, '₹', opts.amount);
    return {
      id: `pl_dev_${Date.now()}`,
      short_url: `https://rzp.io/dev/${opts.invoiceId}`,
    };
  }

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const body = {
    amount: Math.round(opts.amount * 100), // Razorpay uses paise
    currency: 'INR',
    description: opts.description,
    customer: {
      name: opts.tenantName,
      contact: opts.tenantPhone.startsWith('+') ? opts.tenantPhone : `+91${opts.tenantPhone}`,
    },
    notify: { sms: true, email: false },
    reminder_enable: true,
    notes: { invoice_id: opts.invoiceId },
    callback_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/razorpay-webhook`,
    callback_method: 'get',
  };

  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(`Razorpay error: ${err.error?.description || res.statusText}`);
  }

  const data = await res.json() as any;
  return { id: data.id, short_url: data.short_url };
}

/**
 * Verifies a Razorpay webhook signature.
 * Call this in the webhook handler to confirm the request is from Razorpay.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!isRazorpayConfigured || !process.env.RAZORPAY_WEBHOOK_SECRET) return true; // pass in dev

  const crypto = require('crypto') as typeof import('crypto');
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}
