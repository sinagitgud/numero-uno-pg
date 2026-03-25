import axios from 'axios';
import { firebaseAuth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Firebase ID token ────────────────────────────
api.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: D17 — retry once with fresh token on 401 ───────────
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const user = firebaseAuth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(/* forceRefresh */ true);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          isRefreshing = false;
          return api(originalRequest);
        }
      } catch {
        isRefreshing = false;
      }

      // Still 401 after refresh → force logout
      isRefreshing = false;
      if (typeof window !== 'undefined') {
        document.cookie = 'auth-token=; path=/; max-age=0';
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
