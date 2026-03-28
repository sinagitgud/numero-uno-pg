'use client';

import { LogOut, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { logout } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'OWNER' || user?.role === 'SALES_MANAGER';

  const { data: pendingData } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: () => api.get<{ success: boolean; data: unknown[] }>('/auth/pending-approvals').then(r => r.data.data?.length ?? 0),
    enabled: isStaff,
    refetchInterval: 60_000,
  });

  const pendingCount = (pendingData as number) ?? 0;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Logged out');
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
      <h1 className="font-semibold text-base truncate">{title}</h1>
      <div className="flex items-center gap-2">
        {/* Initials avatar — always visible */}
        {user?.name && (
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center select-none">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        {isStaff && pendingCount > 0 && (
          <button
            onClick={() => router.push('/approvals')}
            className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label={`${pendingCount} pending approvals`}
          >
            <UserCheck className="w-4 h-4 text-primary" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="p-3 rounded-md hover:bg-muted transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
