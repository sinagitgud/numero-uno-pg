'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getQueryClient } from '@/lib/queryClient';
import { initTokenRefresh } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallBanner } from '@/components/layout/InstallBanner';

const STAFF_ROLES = ['OWNER', 'SALES_MANAGER', 'OPS_MANAGER'];

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  // D15: Token auto-refresh + role sync
  useEffect(() => {
    const unsub = initTokenRefresh();
    return unsub;
  }, []);

  // Redirect to correct portal if role doesn't match current route.
  // Catches stale-cache scenarios where role was upgraded server-side.
  useEffect(() => {
    if (!user || pathname === '/login' || pathname === '/pending') return;

    const isStaff = STAFF_ROLES.includes(user.role);
    const onTenantRoute = pathname.startsWith('/tenant');
    const onStaffRoute = !onTenantRoute && pathname !== '/';

    if (user.isPendingApproval) {
      router.replace('/pending');
    } else if (isStaff && onTenantRoute) {
      // Staff landed on tenant portal — push to dashboard
      router.replace('/dashboard');
    } else if (!isStaff && onStaffRoute) {
      // Tenant landed on staff portal — push to tenant home
      router.replace('/tenant');
    }
  }, [user, pathname, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-md mx-auto relative min-h-screen flex flex-col">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNav />
        <InstallBanner />
      </div>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: { marginBottom: '72px', fontSize: '14px' },
        }}
      />
    </QueryClientProvider>
  );
}