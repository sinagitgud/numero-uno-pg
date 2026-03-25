'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonList } from '@/components/shared/PageLoader';
import { Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaveRequest {
  id: string; fromDate: string; toDate: string;
  reason: string | null; status: string; createdAt: string;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'REJECTED') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING:  'bg-yellow-100 text-yellow-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function TenantLeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fromDate: '', toDate: '', reason: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get<{ success: boolean; data: LeaveRequest[] }>('/leaves/me').then((r) => r.data.data),
  });

  const apply = useMutation({
    mutationFn: () => api.post('/leaves', {
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason || undefined,
    }),
    onSuccess: () => {
      toast.success('Leave request submitted');
      setShowForm(false);
      setForm({ fromDate: '', toDate: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: () => toast.error('Failed to submit leave request'),
  });

  const nights = form.fromDate && form.toDate
    ? Math.max(0, Math.round((new Date(form.toDate).getTime() - new Date(form.fromDate).getTime()) / 86400000))
    : 0;

  const canSubmit = form.fromDate && form.toDate && new Date(form.toDate) >= new Date(form.fromDate);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Leave" />

      <div className="p-4 space-y-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>

        {showForm && (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Leave Request</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">From *</label>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To *</label>
                <input
                  type="date"
                  value={form.toDate}
                  min={form.fromDate}
                  onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {nights > 0 && (
              <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Going home for festival"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => apply.mutate()}
                disabled={!canSubmit || apply.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-60"
              >
                {apply.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {isLoading && <SkeletonList rows={4} />}

        {!isLoading && (!data || data.length === 0) && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-12">No leave requests yet.</p>
        )}

        {data?.map((leave) => (
          <div key={leave.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={leave.status} />
                  <span className="font-medium text-sm">
                    {fmt(leave.fromDate)} — {fmt(leave.toDate)}
                  </span>
                </div>
                {leave.reason && (
                  <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Applied {fmt(leave.createdAt)}
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(leave.status)}`}>
                {leave.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
