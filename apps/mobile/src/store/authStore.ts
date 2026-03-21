import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

type UserRole = 'OWNER' | 'SALES_MANAGER' | 'OPS_MANAGER' | 'TENANT';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  email?: string;
}

interface AuthState {
  user: AuthUser | null;
  firebaseToken: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setFirebaseToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  isStaff: () => boolean;
  isTenant: () => boolean;
  isOwner: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseToken: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setFirebaseToken: (firebaseToken) => set({ firebaseToken }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    await AsyncStorage.removeItem('user');
    set({ user: null, firebaseToken: null });
  },

  isStaff: () => {
    const role = get().user?.role;
    return role === 'OWNER' || role === 'SALES_MANAGER' || role === 'OPS_MANAGER';
  },

  isTenant: () => get().user?.role === 'TENANT',
  isOwner: () => get().user?.role === 'OWNER',
}));
