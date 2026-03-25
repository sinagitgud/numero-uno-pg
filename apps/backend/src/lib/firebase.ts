import * as admin from 'firebase-admin';

const isFirebaseConfigured =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== 'REPLACE_IN_PHASE_2' &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_PRIVATE_KEY !== 'REPLACE_IN_PHASE_2';

// SECURITY: In production, Firebase must be properly configured.
// A missing config in prod means ALL requests would be accepted — crash early.
if (!isFirebaseConfigured && process.env.NODE_ENV === 'production') {
  console.error('FATAL: Firebase credentials are not configured in production.');
  console.error('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY env vars.');
  process.exit(1);
}

if (!admin.apps.length) {
  if (isFirebaseConfigured) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Development mode only: Firebase not configured, tokens are not verified.
    admin.initializeApp({ projectId: 'numero-uno-pg-dev' });
    console.warn('⚠️  Firebase running in DEV MODE — auth tokens will NOT be verified. Never run this in production.');
  }
}

export const firebaseAdmin = admin;

// In dev mode, auth() may not work — guard callers accordingly
let _auth: admin.auth.Auth | null = null;
try {
  _auth = admin.auth();
} catch {
  _auth = null;
}
export const auth = _auth;
