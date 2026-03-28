'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LeaveItem {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  tenant: { user: { name: string; phone?: string | null } };
}

export default function LeavesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data, isLoading } = useQuery<{ data: LeaveItem[] }>({
    queryKey: ['leaves', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/leaves', { params: { status: statusFilter || undefined, limit: 100 } });
      return data;
    },
  });

  const { mutate: updateLeave } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/leaves/${id}`, { status });
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      toast.success(`Leave ${status.toLowerCase()} ✓`);
    },
    onError: () => toast.error('Failed to update leave.'),
  });

  const leaves = data?.data ?? [];

  return (
    <div>
      <Header title="Leave Requests" />
      <div className="px-4 py-4 space-y-4">

        {/* Filter */}
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : leaves.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No leave requests.</p>
          ) : leaves.map((l) => (
            <div key={l.id} className="px-4 py-3 border-b last:border-0">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{l.tenant.user.name}</p>
                  {l.tenant.user.phone && (
                    <a href={`tel:${l.tenant.user.phone}`} className="text-xs text-primary underline">{l.tenant.user.phone}</a>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(l.fromDate)} → {formatDate(l.toDate)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{l.reason}</p>
                </div>
                {l.status === 'PENDING' && (
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => updateLeave({ id: l.id, status: 'APPROVED' })}
                      className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                      aria-label="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateLeave({ id: l.id, status: 'REJECTED' })}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {l.status !== 'PENDING' && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {l.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
