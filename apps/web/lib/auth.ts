import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onIdTokenChanged,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { api } from './api';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '@numero-uno-pg/shared';

// ── D15: Token auto-refresh via onIdTokenChanged (not setInterval) ───────────
// Call this once in the root layout. Returns an unsubscribe function.
export function initTokenRefresh(): () => void {
  if (!firebaseAuth) return () => {};
  return onIdTokenChanged(firebaseAuth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      useAuthStore.getState().setToken(token);
    }
  });
}

// ── Register / link Firebase user with backend ───────────────────────────────
async function registerWithBackend(token: string): Promise<AuthUser> {
  const { data } = await api.post<{ success: boolean; data: AuthUser }>(
    '/auth/register',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!data.success) throw new Error('Registration failed');
  return data.data;
}

// ── Email OTP (magic link) login ─────────────────────────────────────────────
export async function sendEmailOtp(email: string): Promise<void> {
  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: `${window.location.origin}/login?finish=1`,
    handleCodeInApp: true,
  });
  localStorage.setItem('emailForSignIn', email);
}

export async function completeEmailOtp(emailLink: string, rememberMe = false): Promise<AuthUser> {
  const email = localStorage.getItem('emailForSignIn') || '';
  await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const result = await signInWithEmailLink(firebaseAuth, email, emailLink);
  const token = await result.user.getIdToken();
  const authUser = await registerWithBackend(token);
  useAuthStore.getState().setAuth(authUser, token);
  localStorage.removeItem('emailForSignIn');
  return authUser;
}

// ── Phone OTP login ──────────────────────────────────────────────────────────
export async function sendPhoneOtp(
  phone: string,
  recaptchaContainerId: string
): Promise<import('firebase/auth').ConfirmationResult> {
  const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, { size: 'invisible' });
  return signInWithPhoneNumber(firebaseAuth, phone, verifier);
}

export async function confirmPhoneOtp(
  confirmationResult: import('firebase/auth').ConfirmationResult,
  otp: string,
  rememberMe = false
): Promise<AuthUser> {
  await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const result = await confirmationResult.confirm(otp);
  const token = await result.user.getIdToken();
  const authUser = await registerWithBackend(token);
  useAuthStore.getState().setAuth(authUser, token);
  return authUser;
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(firebaseAuth);
  useAuthStore.getState().logout();
}
