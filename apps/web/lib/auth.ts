import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onIdTokenChanged,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { api } from './api';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '@numero-uno-pg/shared';

// ── D15: Token auto-refresh + role sync via onIdTokenChanged ─────────────────
// Fires on app open and whenever the Firebase token expires (~hourly).
// Also re-syncs the user's role/name/isActive from the backend so that
// server-side changes (role upgrade, approval) are reflected automatically.
export function initTokenRefresh(): () => void {
  return onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken();
      useAuthStore.getState().setToken(token);
      // Sync role from backend — handles cases where role was changed server-side
      // (e.g. TENANT→OWNER via migration, or pending tenant got approved)
      try {
        const { data } = await api.post<{ success: boolean; data: AuthUser }>(
          '/auth/register',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success && data.data) {
          useAuthStore.getState().setAuth(data.data, token);
        }
      } catch {
        // Non-fatal — keep cached role if backend is unreachable
      }
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
