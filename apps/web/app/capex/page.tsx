'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CapexItem {
  id: string;
  propertyId?: string | null;
  category: string;
  item: string;
  amount: number;
  date: string;
  notes?: string | null;
  property?: { name: string } | null;
}

interface AddForm {
  category: string;
  item: string;
  amount: string;
  date: string;
  notes: string;
}

const CATEGORIES = ['FURNITURE', 'APPLIANCES', 'CIVIL', 'ELECTRICAL', 'PLUMBING', 'IT', 'SECURITY', 'OTHER'];

const INITIAL: AddForm = {
  category: 'FURNITURE',
  item: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function CapexPage() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(INITIAL);

  const { data, isLoading } = useQuery<CapexItem[]>({
    queryKey: ['capex', year],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: CapexItem[] }>('/capex', { params: { year } });
      return data.data ?? [];
    },
  });

  const items = data ?? [];
  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  // Group by category for summary
  const byCategory = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  const { mutate: addCapex, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.item.trim()) throw new Error('Item description required');
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Valid amount required');
      await api.post('/capex', {
        ...form,
        amount: Number(form.amount),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capex', year] });
      toast.success('Capex entry added');
      setForm(INITIAL);
      setShowAdd(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const set = (k: keyof AddForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <Header title="Capital Expenditure" />
      <div className="px-4 py-4 space-y-4">

        {/* Year nav + total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => setYear((y) => y - 1)} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium w-16 text-center">{year}</span>
            <button onClick={() => setYear((y) => y + 1)} className="p-1 rounded hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-sm font-bold text-orange-600">{formatCurrency(total)}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <span key={cat} className="bg-muted rounded-lg px-2.5 py-1 text-xs">
                  {cat.replace(/_/g, ' ')} · {formatCurrency(amt)}
                </span>
              ))}
          </div>
        )}

        {/* Item list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1, 2, 3].map((i) => <SkeletonRow key={i} cols={3} />)
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No capex for {year}. Tap + to add.</p>
          ) : items.map((item) => (
            <div key={item.id} className="flex items-start justify-between px-4 py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{item.item}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category.replace(/_/g, ' ')} · {formatDate(item.date)}
                </p>
                {item.property && <p className="text-xs text-muted-foreground">{item.property.name}</p>}
                {item.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{item.notes}</p>}
              </div>
              <p className="text-sm font-semibold text-orange-600">{formatCurrency(Number(item.amount))}</p>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add Capex Entry</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {[
              ['item', 'Item Description', 'text'],
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

            <button
              onClick={() => addCapex()}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Entry
            </button>
          </div>
        )}
      </div>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90"
          aria-label="Add capex"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
