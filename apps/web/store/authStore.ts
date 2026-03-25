import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, UserRole } from '@numero-uno-pg/shared';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        // Write both auth-token and user-role cookies for Edge middleware
        document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `user-role=${user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        set({ user, token });
      },
      setToken: (token) => {
        document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        set({ token });
      },
      logout: () => {
        document.cookie = 'auth-token=; path=/; max-age=0';
        document.cookie = 'user-role=; path=/; max-age=0';
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// RBAC helpers
export const canAccess = (role: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  if (!role) return false;
  return allowedRoles.includes(role);
};
