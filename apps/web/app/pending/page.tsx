'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { logout } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, setAuth, token } = useAuthStore();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['pending-approval-status'],
    queryFn: async () => {
      if (!token) return null;
      const { data } = await api.post<{ success: boolean; data: typeof user }>(
        '/auth/register',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data.success || !data.data) throw new Error('Failed to check status');
      return data.data;
    },
    enabled: !!token,
    refetchInterval: 30_000,
    retry: false,
  });

  // Auto-redirect when approved
  useEffect(() => {
    if (!data) return;
    const authUser = data as any;
    if (!authUser?.isPendingApproval) {
      setAuth(authUser, token!);
      toast.success('Your account has been approved!');
      const dest = authUser?.role === 'TENANT' ? '/tenant' : '/dashboard';
      router.replace(dest);
    } else {
      setAuth(authUser, token!);
    }
  }, [data, token, setAuth, router]);

  const checkNow = async () => {
    try {
      await refetch();
      const authUser = data as any;
      if (authUser?.isPendingApproval !== false) {
        toast('Still waiting for approval…', { icon: '⏳' });
      }
    } catch {
      toast.error('Could not check status. Try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-yellow-600" />
      </div>

      <h1 className="text-xl font-bold mb-2">Account Pending Approval</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        Your account has been created. A staff member will approve it shortly.
        You'll get full access once approved.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={checkNow}
          disabled={isFetching}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Checking…' : 'Check Again'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border rounded-lg py-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Hi, {user?.name}. Return here and tap 'Check Again' to see if you've been approved.
        We'll also check automatically every 30 seconds.
      </p>
    </div>
  );
}
