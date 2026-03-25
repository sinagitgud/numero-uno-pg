'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatCurrency, formatDate, monthLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ExpenseItem {
  id: string;
  date: string;
  amount: number;
  category: string;
  subCategory?: string | null;
  paidBy: string;
  mode: string;
  notes?: string | null;
  property?: { name: string; code: string } | null;
}

const CATEGORIES = ['MANAGERS','MARKETING','GENERAL','PROPERTY_SPECIFIC','FOOD','RENT_TO_LANDLORDS','CAPEX'];
const MODES = ['CASH','UPI','BANK_TRANSFER','CARD'];

interface AddForm {
  date: string; amount: string; category: string;
  subCategory: string; paidBy: string; mode: string; notes: string;
}

const INITIAL: AddForm = {
  date: new Date().toISOString().split('T')[0], amount: '',
  category: 'GENERAL', subCategory: '', paidBy: '', mode: 'CASH', notes: '',
};

export default function ExpensesPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<AddForm>>({});

  const { data, isLoading } = useQuery<ExpenseItem[]>({
    queryKey: ['expenses', month, year],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ExpenseItem[] }>('/expenses', { params: { month, year } });
      return data.data ?? [];
    },
  });

  const expenses = data ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const navigate = (dir: -1 | 1) => {
    let m = month + dir; let y = year;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const { mutate: addExpense, isPending } = useMutation({
    mutationFn: async () => {
      const errs: Partial<AddForm> = {};
      if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
      if (!form.date) errs.date = 'Select a date';
      if (!form.paidBy.trim()) errs.paidBy = 'Enter who paid';
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Validation'); }
      setErrors({});
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', month, year] });
      toast.success('Expense added ✓');
      setForm(INITIAL);
      setShowAdd(false);
    },
    onError: (err: any) => {
      if (err.message !== 'Validation') toast.error('Failed to add expense.');
    },
  });

  return (
    <div>
      <Header title="Expenses" />
      <div className="px-4 py-4 space-y-4">

        {/* Month nav + total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium w-32 text-center">{monthLabel(month, year)}</span>
            <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <span className="text-sm font-semibold text-red-500">{formatCurrency(total)}</span>
        </div>

        {/* List */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : expenses.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No expenses this month. Tap + to add one.</p>
          ) : expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{e.category.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.date)} · {e.paidBy} · {e.mode}</p>
                {e.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{e.notes}</p>}
              </div>
              <span className="text-sm font-semibold text-red-500">{formatCurrency(Number(e.amount))}</span>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add Expense</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            {([
              ['amount', 'Amount (₹)', 'number'],
              ['date', 'Date', 'date'],
              ['paidBy', 'Paid By', 'text'],
              ['subCategory', 'Sub-category (optional)', 'text'],
              ['notes', 'Notes (optional)', 'text'],
            ] as [keyof AddForm, string, string][]).map(([key, label, type]) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: undefined })); }}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                {errors[key] && <p className="text-xs text-destructive mt-1">{errors[key]}</p>}
              </div>
            ))}
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Mode</label>
              <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background">
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button onClick={() => addExpense()} disabled={isPending} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Expense
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90"
          aria-label="Add expense"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
