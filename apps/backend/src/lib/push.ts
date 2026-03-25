/**
 * FCM Push Notification utility — feature-flagged.
 * Uses Firebase Admin SDK (already initialized in firebase.ts).
 * Logs to console when Firebase is not configured.
 */
import { firebaseAdmin } from './firebase';

const isPushAvailable = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== 'REPLACE_IN_PHASE_2' &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single FCM token.
 * Silently no-ops in dev mode (no Firebase credentials).
 */
export async function sendPush(fcmToken: string, payload: PushPayload): Promise<void> {
  if (!isPushAvailable) {
    console.log(`[push:dev] Would send to ${fcmToken.slice(0, 10)}...: ${payload.title} — ${payload.body}`);
    return;
  }
  try {
    await firebaseAdmin.messaging().send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err) {
    // Non-fatal: expired/invalid tokens are common. Don't block calling code.
    console.error('[push] Failed to send notification:', err);
  }
}

/**
 * Send a push notification to multiple FCM tokens.
 * Silently skips tokens that are empty/null.
 */
export async function sendPushToMany(fcmTokens: (string | null)[], payload: PushPayload): Promise<void> {
  const valid = fcmTokens.filter(Boolean) as string[];
  await Promise.all(valid.map((t) => sendPush(t, payload)));
}
