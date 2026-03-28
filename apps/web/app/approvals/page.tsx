'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, X, Check, Phone, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/shared/PageLoader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PendingUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: PendingUser[] }>({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/auth/pending-approvals').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const pending = data?.data ?? [];

  const approve = useMutation({
    mutationFn: (userId: string) => api.post(`/auth/approve/${userId}`),
    onMutate: (userId) => setActing(userId),
    onSuccess: (_, userId) => {
      toast.success('Tenant approved');
      qc.invalidateQueries({ queryKey: ['pending-approvals'] });
      qc.invalidateQueries({ queryKey: ['pending-approvals-count'] });
      setActing(null);
    },
    onError: () => {
      toast.error('Could not approve. Try again.');
      setActing(null);
    },
  });

  const reject = useMutation({
    mutationFn: (userId: string) => api.post(`/auth/reject/${userId}`),
    onMutate: (userId) => setActing(userId),
    onSuccess: () => {
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['pending-approvals'] });
      qc.invalidateQueries({ queryKey: ['pending-approvals-count'] });
      setActing(null);
    },
    onError: () => {
      toast.error('Could not reject. Try again.');
      setActing(null);
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <Header title="Pending Approvals" />
      <div className="px-4 py-4 space-y-4">

        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <UserCheck className="w-10 h-10 text-green-500" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No tenants waiting for approval.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {pending.length} tenant{pending.length !== 1 ? 's' : ''} waiting for approval.
              Approve to give access, Reject to remove the request.
            </p>

            <div className="rounded-xl border divide-y overflow-hidden">
              {pending.map((user) => {
                const isActing = acting === user.id;
                return (
                  <div key={user.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {user.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Registered {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => reject.mutate(user.id)}
                        disabled={isActing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => approve.mutate(user.id)}
                        disabled={isActing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        aria-label="Approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
