'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Download } from 'lucide-react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, monthLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface InvoiceDetail {
  id: string;
  month: number; year: number;
  amountDue: number; amountPaid: number;
  status: string;
  dueDate: string;
  notes?: string;
  tenant: {
    id: string;
    rate: number;
    user: { name: string; phone?: string | null };
    bed: { label: string; room: { number: string; property: { name: string } } };
  };
  payments: Array<{ id: string; amount: number; date: string; mode: string; notes?: string | null }>;
}

const PaymentSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
  mode: z.enum(['UPI', 'CASH', 'CARD', 'BANK_TRANSFER']),
  date: z.string().min(1, 'Select a date'),
  notes: z.string().optional(),
});

type PaymentForm = { amount: string; mode: string; date: string; notes: string };

const INITIAL_FORM: PaymentForm = {
  amount: '',
  mode: 'CASH',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState<PaymentForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentForm, string>>>({});
  const [showForm, setShowForm] = useState(false);

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: InvoiceDetail }>(`/invoices/${id}`);
      return data.data;
    },
    staleTime: 0, // D19
  });

  const { mutate: recordPayment, isPending } = useMutation({
    mutationFn: async () => {
      const parsed = PaymentSchema.safeParse({ ...form, amount: Number(form.amount) });
      if (!parsed.success) {
        const fieldErrors: typeof errors = {};
        parsed.error.errors.forEach((e) => { if (e.path[0]) fieldErrors[e.path[0] as keyof PaymentForm] = e.message; });
        setErrors(fieldErrors);
        throw new Error('Validation failed');
      }

      // D: prevent overpayment
      const remaining = Number(invoice?.amountDue) - Number(invoice?.amountPaid);
      if (parsed.data.amount > remaining + 0.01) {
        setErrors({ amount: `Amount exceeds outstanding balance of ${formatCurrency(remaining)}` });
        throw new Error('Overpayment');
      }

      setErrors({});
      await api.post('/payments', { invoiceId: id, ...parsed.data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded ✓');
      setForm(INITIAL_FORM);
      setShowForm(false);
    },
    onError: (err: any) => {
      if (err.message !== 'Validation failed' && err.message !== 'Overpayment') {
        toast.error(err.response?.data?.error || 'Failed to record payment.');
      }
    },
  });

  const downloadReceipt = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/receipt`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${invoice?.tenant.user.name}-${invoice ? monthLabel(invoice.month, invoice.year) : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate receipt');
    } finally {
      setDownloading(false);
    }
  };

  const sendRazorpay = async () => {
    try {
      const { data } = await api.post('/payments/razorpay-order', { invoiceId: id });
      if (data?.data?.short_url) {
        window.open(data.data.short_url, '_blank');
      }
    } catch {
      toast.error('Could not create Razorpay link. Check configuration.');
    }
  };

  if (isLoading || !invoice) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading invoice…</div>;
  }

  const balance = Number(invoice.amountDue) - Number(invoice.amountPaid);
  const isPaid = invoice.status === 'PAID';

  return (
    <div>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-semibold text-sm">{invoice.tenant.user.name}</h1>
          <p className="text-xs text-muted-foreground">{monthLabel(invoice.month, invoice.year)}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Summary */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount Due</span><span className="font-semibold">{formatCurrency(Number(invoice.amountDue))}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Collected</span><span className="font-semibold text-green-600">{formatCurrency(Number(invoice.amountPaid))}</span></div>
          {!isPaid && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance</span><span className="font-semibold text-red-500">{formatCurrency(balance)}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Due Date</span><span>{formatDate(invoice.dueDate)}</span></div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-semibold ${invoice.status === 'PAID' ? 'text-green-600' : invoice.status === 'OVERDUE' ? 'text-red-500' : 'text-yellow-600'}`}>{invoice.status}</span>
          </div>
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payments</h2>
            <div className="rounded-xl border overflow-hidden">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.date)} · {p.mode}</p>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground max-w-24 text-right truncate">{p.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!isPaid && (
            <>
              <button
                onClick={() => setShowForm(!showForm)}
                className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold"
              >
                Record Payment
              </button>
              <button
                onClick={sendRazorpay}
                className="w-full flex items-center justify-center gap-2 border rounded-lg py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Send Razorpay Link
              </button>
            </>
          )}
          {invoice.payments.length > 0 && (
            <button
              onClick={downloadReceipt}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 border rounded-lg py-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading…' : 'Download Receipt'}
            </button>
          )}
        </div>

        {/* Payment form */}
        {showForm && !isPaid && (
          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold text-sm">Record Payment</h3>
            <div>
              <label className="text-sm font-medium block mb-1">Amount (₹)</label>
              <input
                value={form.amount}
                onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setErrors((e2) => ({ ...e2, amount: undefined })); }}
                type="number"
                placeholder={String(Math.round(balance))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input
                value={form.date}
                onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); setErrors((e2) => ({ ...e2, date: undefined })); }}
                type="date"
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Transaction ref, etc."
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
            <button
              onClick={() => recordPayment()}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
