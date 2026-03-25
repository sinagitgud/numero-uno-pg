'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getQueryClient } from '@/lib/queryClient';
import { initTokenRefresh } from '@/lib/auth';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallBanner } from '@/components/layout/InstallBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // D15: Token auto-refresh via Firebase listener
  useEffect(() => {
    const unsub = initTokenRefresh();
    return unsub;
  }, []);

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
