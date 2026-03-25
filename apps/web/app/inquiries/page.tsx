'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, ChevronDown, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InquiryItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  bedPreference?: string | null;
  budget?: number | null;
  inquiryDate: string;
  status: 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'CONVERTED' | 'DROPPED';
  notes?: string | null;
  property?: { name: string; code: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  VISIT_SCHEDULED: 'bg-purple-100 text-purple-700',
  CONVERTED: 'bg-green-100 text-green-700',
  DROPPED: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CONVERTED', 'DROPPED'];

interface AddForm {
  name: string; phone: string; email: string;
  bedPreference: string; budget: string; notes: string;
}

const INIT: AddForm = { name: '', phone: '', email: '', bedPreference: '', budget: '', notes: '' };

export default function InquiriesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(INIT);
  const [errors, setErrors] = useState<Partial<AddForm>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: InquiryItem[] }>({
    queryKey: ['inquiries', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/inquiries', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
  });

  const inquiries = data?.data ?? [];

  const { mutate: addInquiry, isPending } = useMutation({
    mutationFn: async () => {
      const errs: Partial<AddForm> = {};
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit phone';
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Validation'); }
      setErrors({});
      await api.post('/inquiries', {
        name: form.name.trim(),
        phone: `+91${form.phone}`,
        email: form.email || undefined,
        bedPreference: form.bedPreference || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success('Inquiry added ✓');
      setForm(INIT);
      setShowAdd(false);
    },
    onError: (err: any) => {
      if (err.message !== 'Validation') toast.error('Failed to add inquiry.');
    },
  });

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/inquiries/${id}`, { status });
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success(`Moved to ${status}`);
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <Header title="Inquiries" />
      <div className="px-4 py-4 space-y-4">

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : inquiries.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No inquiries yet. Tap + to log one.
            </p>
          ) : inquiries.map((inq) => (
            <div key={inq.id} className="px-4 py-3 border-b last:border-0">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{inq.name}</p>
                  <p className="text-xs text-muted-foreground">{inq.phone} · {formatDate(inq.inquiryDate)}</p>
                  {inq.bedPreference && <p className="text-xs text-muted-foreground">Bed: {inq.bedPreference}</p>}
                  {inq.budget && <p className="text-xs text-muted-foreground">Budget: {formatCurrency(inq.budget)}</p>}
                  {inq.notes && <p className="text-xs text-muted-foreground line-clamp-1">{inq.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 ml-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inq.status]}`}>
                    {inq.status.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1">
                    <a href={`tel:${inq.phone}`} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    {/* Quick status advance */}
                    {inq.status !== 'CONVERTED' && inq.status !== 'DROPPED' && (
                      <select
                        value={inq.status}
                        onChange={(e) => updateStatus(inq.id, e.target.value)}
                        disabled={updatingId === inq.id}
                        className="text-[10px] border rounded px-1 py-0.5 bg-background outline-none"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Log Inquiry</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Name *</label>
              <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: undefined })); }} placeholder="Amit Kumar" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Phone *</label>
              <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2.5 text-sm font-semibold bg-muted">+91</span>
                <input value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors((er) => ({ ...er, phone: undefined })); }} inputMode="numeric" placeholder="9876543210" className="flex-1 px-3 py-2.5 text-sm outline-none bg-background" />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Bed preference</label>
              <input value={form.bedPreference} onChange={(e) => setForm((f) => ({ ...f, bedPreference: e.target.value }))} placeholder="AC double, Koramangala" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Budget (₹/mo)</label>
              <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="8000" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background resize-none" />
            </div>
            <button onClick={() => addInquiry()} disabled={isPending} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Inquiry
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90"
          aria-label="Add inquiry"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
