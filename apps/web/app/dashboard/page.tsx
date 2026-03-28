'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw, Zap, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/shared/StatCard';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { formatCurrency, monthLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── API types (inferred from dashboard.ts response shapes) ──
interface Snapshot {
  todayCollections: { total: number; count: number };
  pendingPaymentsCount: number;
  openTicketsCount: number;
  occupancy: { rate: number; occupied: number; total: number };
}

interface Receivable {
  tenantName: string;
  property: string;
  amountDue: number;
  daysOverdue: number;
  status: string;
}

interface MonthlyReport {
  month: number; year: number;
  revenue: { expected: number; collected: number; collectionRate: number; byProperty: Record<string, number> };
  expenses: { total: number; breakdown: Record<string, number> };
  pnl: number;
  receivables: Receivable[];
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const { data: snapshot, isLoading: snapLoading, error: snapError } = useQuery<Snapshot>({
    queryKey: ['snapshot'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Snapshot }>('/dashboard/snapshot');
      return data.data;
    },
    staleTime: 0,
  });

  const { data: monthly, isLoading: monthLoading, refetch: refetchMonthly } = useQuery<MonthlyReport>({
    queryKey: ['monthly', month, year],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: MonthlyReport }>('/dashboard/monthly', { params: { month, year } });
      return data.data;
    },
  });

  const navigate = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      await api.post('/invoices/generate-monthly');
      toast.success('Invoice generation started — check back in a minute.');
      setShowGenerateConfirm(false);
    } catch {
      toast.error('Failed to start invoice generation.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="px-4 py-4 space-y-6">

        {/* Snapshot cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today</h2>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['snapshot'] })}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {snapError && (
            <p className="text-sm text-destructive">Could not load data. Pull to refresh.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {snapLoading ? (
              [1,2,3,4].map(i => <SkeletonCard key={i} />)
            ) : snapshot ? (
              <>
                <StatCard label="Today's Collections" value={formatCurrency(snapshot.todayCollections.total)} sub={`${snapshot.todayCollections.count} payments`} accent="green" />
                <StatCard label="Pending Invoices" value={snapshot.pendingPaymentsCount} accent={snapshot.pendingPaymentsCount > 0 ? 'red' : 'default'} />
                <StatCard label="Open Tickets" value={snapshot.openTicketsCount} accent={snapshot.openTicketsCount > 5 ? 'yellow' : 'default'} />
                <StatCard label="Occupancy" value={`${snapshot.occupancy.rate}%`} sub={`${snapshot.occupancy.occupied}/${snapshot.occupancy.total} beds`} accent={snapshot.occupancy.rate > 80 ? 'green' : 'default'} />
              </>
            ) : null}
          </div>
        </section>

        {/* Generate monthly invoices */}
        {!showGenerateConfirm ? (
          <button
            onClick={() => setShowGenerateConfirm(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 text-primary rounded-xl py-3 text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Generate Monthly Invoices
          </button>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-primary">Confirm Invoice Generation</p>
              <button onClick={() => setShowGenerateConfirm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will generate invoices for all active tenants for {monthLabel(month, year)}. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGenerateConfirm(false)}
                className="flex-1 border rounded-lg py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={generateInvoices}
                disabled={generating}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Generating…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* Monthly report */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly Report</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-medium w-28 text-center">{monthLabel(month, year)}</span>
              <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {monthLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : monthly ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Expected" value={formatCurrency(monthly.revenue.expected)} />
                <StatCard label="Collected" value={formatCurrency(monthly.revenue.collected)} accent="green" />
                <StatCard label="Net P&L" value={formatCurrency(monthly.pnl)} accent={monthly.pnl >= 0 ? 'green' : 'red'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Total Expenses" value={formatCurrency(monthly.expenses.total)} accent="red" />
                <StatCard label="Collection Rate" value={`${monthly.revenue.collectionRate}%`} />
              </div>

              {/* Receivables */}
              {monthly.receivables.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Receivables</h3>
                  <div className="rounded-xl border overflow-hidden">
                    {monthly.receivables.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{r.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{r.property} · {r.daysOverdue > 0 ? `${r.daysOverdue}d overdue` : 'due'}</p>
                        </div>
                        <span className={`text-sm font-semibold ${r.daysOverdue > 0 ? 'text-red-500' : 'text-yellow-600'}`}>
                          {formatCurrency(r.amountDue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monthly.receivables.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  All paid up! 🎉
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
