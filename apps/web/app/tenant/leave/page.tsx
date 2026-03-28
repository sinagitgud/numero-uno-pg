'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, CalendarOff, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import toast from 'react-hot-toast';

interface LeaveRequest {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Pending',  color: 'text-yellow-700 bg-yellow-100', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'Approved', color: 'text-green-700 bg-green-100',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Rejected', color: 'text-red-700 bg-red-100',       icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function TenantLeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-leaves'],
    queryFn: () => api.get<{ success: boolean; data: LeaveRequest[] }>('/leaves/me').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/leaves', {
      fromDate,
      toDate,
      reason: reason.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-leaves'] });
      setShowForm(false);
      setFromDate('');
      setToDate('');
      setReason('');
      toast.success('Leave request submitted!');
    },
    onError: () => toast.error('Failed to submit request. Try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate) { toast.error('Select start date'); return; }
    if (!toDate) { toast.error('Select end date'); return; }
    if (new Date(toDate) < new Date(fromDate)) { toast.error('End date must be after start date'); return; }
    createMutation.mutate();
  };

  const leaves = data ?? [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const nightCount = (from: string, to: string) => {
    const diff = new Date(to).getTime() - new Date(from).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) return (
    <div className="pb-20">
      <Header title="Leave" />
      <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Leave" />

      <div className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Going home or travelling? Let your property manager know so they can plan accordingly.
        </p>

        {showForm ? (
          <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Apply for Leave</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">From *</label>
                <input
                  type="date"
                  value={fromDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFromDate(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">To *</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={e => setToDate(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {fromDate && toDate && new Date(toDate) >= new Date(fromDate) && (
              <p className="text-xs text-muted-foreground text-center">
                {nightCount(fromDate, toDate)} night{nightCount(fromDate, toDate) !== 1 ? 's' : ''}
              </p>
            )}

            <div>
              <label className="text-sm font-medium">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Going home for Diwali (optional)"
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-xl py-3.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </button>
        )}

        {leaves.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No leave requests yet</div>
        ) : (
          leaves.map(leave => {
            const cfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.PENDING;
            const nights = nightCount(leave.fromDate, leave.toDate);

            return (
              <div key={leave.id} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarOff className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {formatDate(leave.fromDate)} → {formatDate(leave.toDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                  </span>
                </div>
                {leave.reason && (
                  <p className="text-sm text-muted-foreground pl-11">{leave.reason}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
