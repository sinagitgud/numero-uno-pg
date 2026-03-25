'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Investment {
  id: string;
  investorName: string;
  date: string;
  maturityMonth: number;
  maturityYear: number;
  amount: number;
  type: 'INVESTMENT' | 'RETURN';
  notes?: string | null;
}

interface InvestorSummary {
  invested: number;
  returned: number;
  balance: number;
}

interface InvestmentsResponse {
  investments: Investment[];
  summary: Record<string, InvestorSummary>;
}

interface AddForm {
  investorName: string;
  date: string;
  maturityMonth: string;
  maturityYear: string;
  amount: string;
  type: 'INVESTMENT' | 'RETURN';
  notes: string;
}

const now = new Date();
const INITIAL: AddForm = {
  investorName: '',
  date: now.toISOString().split('T')[0],
  maturityMonth: String(now.getMonth() + 1),
  maturityYear: String(now.getFullYear() + 1),
  amount: '',
  type: 'INVESTMENT',
  notes: '',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function InvestmentsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(INITIAL);

  const { data, isLoading } = useQuery<InvestmentsResponse>({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: InvestmentsResponse }>('/investments');
      return data.data;
    },
  });

  const investments = data?.investments ?? [];
  const summary = data?.summary ?? {};

  const { mutate: addInvestment, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.investorName.trim()) throw new Error('Investor name required');
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Valid amount required');
      await api.post('/investments', {
        ...form,
        amount: Number(form.amount),
        maturityMonth: Number(form.maturityMonth),
        maturityYear: Number(form.maturityYear),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investment recorded');
      setForm(INITIAL);
      setShowAdd(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const set = (k: keyof AddForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <Header title="Investments" />
      <div className="px-4 py-4 space-y-4">

        {/* Investor summary cards */}
        {Object.keys(summary).length > 0 && (
          <div className="space-y-2">
            {Object.entries(summary).map(([investor, s]) => (
              <div key={investor} className="bg-card border rounded-xl p-4">
                <p className="text-sm font-semibold">{investor}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(s.invested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Returned</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(s.returned)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`text-sm font-bold ${s.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(s.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1, 2, 3].map((i) => <SkeletonRow key={i} cols={3} />)
          ) : investments.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No investments yet. Tap + to add.</p>
          ) : investments.map((inv) => (
            <div key={inv.id} className="flex items-start justify-between px-4 py-3 border-b last:border-0">
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 p-1 rounded-full ${inv.type === 'INVESTMENT' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {inv.type === 'INVESTMENT'
                    ? <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    : <TrendingDown className="w-3.5 h-3.5 text-green-600" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{inv.investorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inv.date)} · Matures {MONTHS[inv.maturityMonth - 1]} {inv.maturityYear}
                  </p>
                  {inv.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{inv.notes}</p>}
                </div>
              </div>
              <p className={`text-sm font-semibold ${inv.type === 'INVESTMENT' ? 'text-blue-600' : 'text-green-600'}`}>
                {inv.type === 'RETURN' ? '+' : ''}{formatCurrency(Number(inv.amount))}
              </p>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add Entry</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <div className="flex gap-2">
                {(['INVESTMENT', 'RETURN'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {[
              ['investorName', 'Investor Name', 'text'],
              ['amount', 'Amount (₹)', 'number'],
              ['date', 'Date', 'date'],
              ['notes', 'Notes (optional)', 'text'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof AddForm]}
                  onChange={(e) => set(key as keyof AddForm, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
            ))}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Maturity Month</label>
                <select
                  value={form.maturityMonth}
                  onChange={(e) => set('maturityMonth', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Maturity Year</label>
                <input
                  type="number"
                  value={form.maturityYear}
                  onChange={(e) => set('maturityYear', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
            </div>

            <button
              onClick={() => addInvestment()}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        )}
      </div>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90"
          aria-label="Add investment"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
