'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, MessageCircle, AlertTriangle, CheckCircle2, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatCurrency, formatDate, monthLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InvoiceItem {
  id: string;
  month: number; year: number;
  amountDue: number; amountPaid: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string;
  tenant: {
    user: { name: string; phone?: string | null };
    bed: { label: string; room: { number: string; property: { name: string; code: string } } };
  };
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-orange-100 text-orange-700',
  OVERDUE: 'bg-red-100 text-red-600',
};

export default function RentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState<{ invoiceId: string; mode: string; ref: string } | null>(null);
  // Track last reminder sent time per invoice (client-side only)
  const [reminderSentAt, setReminderSentAt] = useState<Record<string, Date>>({});

  const { data, isLoading } = useQuery<{ data: InvoiceItem[] }>({
    queryKey: ['invoices', month, year, statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/invoices', {
        params: { month, year, status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  // Pending payment approvals (tenant self-reports awaiting staff approval)
  interface PendingPayment {
    id: string;
    amount: number;
    date: string;
    mode: string;
    notes: string | null;
    invoice: {
      id: string;
      month: number;
      year: number;
      amountDue: number;
      amountPaid: number;
      tenant: {
        user: { name: string; phone: string | null };
        bed: { label: string; room: { number: string; property: { name: string; code: string } } };
      };
    };
  }

  const { data: pendingData } = useQuery<{ data: PendingPayment[] }>({
    queryKey: ['payments-pending'],
    queryFn: async () => {
      const { data } = await api.get('/payments/pending');
      return data;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const pendingPayments = pendingData?.data ?? [];

  const approvePayment = async (paymentId: string) => {
    setApprovingId(paymentId);
    try {
      await api.post(`/payments/${paymentId}/approve`);
      toast.success('Payment approved ✓');
      qc.invalidateQueries({ queryKey: ['payments-pending'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices-overdue'] });
    } catch {
      toast.error('Could not approve. Try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    setRejectingId(paymentId);
    try {
      await api.post(`/payments/${paymentId}/reject`);
      toast.success('Payment rejected');
      qc.invalidateQueries({ queryKey: ['payments-pending'] });
    } catch {
      toast.error('Could not reject. Try again.');
    } finally {
      setRejectingId(null);
    }
  };

  // Always fetch overdue separately for "Action needed" section (not affected by month filter)
  const { data: overdueData } = useQuery<{ data: InvoiceItem[] }>({
    queryKey: ['invoices-overdue'],
    queryFn: async () => {
      const { data } = await api.get('/invoices', {
        params: { status: 'OVERDUE', limit: 50 },
      });
      return data;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const invoices = data?.data ?? [];
  const overdueInvoices = overdueData?.data ?? [];

  const navigate = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const sendReminder = async (invoice: InvoiceItem) => {
    setSendingReminder(invoice.id);
    try {
      await api.post(`/invoices/${invoice.id}/whatsapp-reminder`);
      setReminderSentAt((prev) => ({ ...prev, [invoice.id]: new Date() }));
      toast.success('WhatsApp reminder sent ✓');
    } catch {
      toast.error('Could not send reminder. Check Gupshup config.');
    } finally {
      setSendingReminder(null);
    }
  };

  const markPaid = async (invoice: InvoiceItem) => {
    if (!markPaidForm || markPaidForm.invoiceId !== invoice.id) {
      setMarkPaidForm({ invoiceId: invoice.id, mode: 'CASH', ref: '' });
      return;
    }
    setMarkingPaid(invoice.id);
    try {
      await api.post('/payments', {
        invoiceId: invoice.id,
        amount: Number(invoice.amountDue) - Number(invoice.amountPaid),
        date: new Date().toISOString().split('T')[0],
        mode: markPaidForm.mode,
        notes: markPaidForm.ref || 'Marked paid manually by staff',
      });
      toast.success('Marked as paid ✓');
      setMarkPaidForm(null);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices-overdue'] });
    } catch {
      toast.error('Could not mark paid. Try again.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const formatReminderTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const overdueTotal = invoices
    .filter((i) => i.status === 'OVERDUE' || i.status === 'PENDING')
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  const allOutstandingTotal = overdueInvoices
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  return (
    <div>
      <Header title="Rent & Invoices" />
      <div className="px-4 py-4 space-y-4">

        {/* PAYMENT APPROVALS — tenant self-reports awaiting approval */}
        {pendingPayments.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-blue-200">
              <ThumbsUp className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm font-semibold text-blue-700">
                Payment approvals — {pendingPayments.length} pending
              </span>
            </div>
            <div className="divide-y divide-blue-100">
              {pendingPayments.map((p) => {
                const isApproving = approvingId === p.id;
                const isRejecting = rejectingId === p.id;
                const busy = isApproving || isRejecting;
                const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return (
                  <div key={p.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.invoice.tenant.user.name}</p>
                        <p className="text-xs text-blue-700">
                          {p.invoice.tenant.bed.room.property.code} · {formatCurrency(p.amount)} · {p.mode} · {MONTHS[p.invoice.month]} {p.invoice.year}
                        </p>
                        {p.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => approvePayment(p.id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {isApproving ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectPayment(p.id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {isRejecting ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTION NEEDED — overdue tenants across all months */}
        {overdueInvoices.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-700">
                Action needed — {overdueInvoices.length} overdue
              </span>
            </div>
            <div className="divide-y divide-red-100">
              {overdueInvoices.map((inv) => {
                const balance = Number(inv.amountDue) - Number(inv.amountPaid);
                const daysOverdue = Math.max(0, Math.floor(
                  (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                ));
                const lastReminder = reminderSentAt[inv.id];
                const isSending = sendingReminder === inv.id;
                const isMarking = markingPaid === inv.id;

                return (
                  <div key={inv.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{inv.tenant.user.name}</p>
                        <p className="text-xs text-red-600">
                          {inv.tenant.bed.room.property.code} · {formatCurrency(balance)} · {daysOverdue}d overdue
                        </p>
                        {lastReminder && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Reminded {formatReminderTime(lastReminder)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => sendReminder(inv)}
                          disabled={isSending || isMarking}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          aria-label="Send WhatsApp reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {isSending ? 'Sending…' : 'Remind'}
                        </button>
                        <button
                          onClick={() => markPaid(inv)}
                          disabled={isSending || isMarking}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                          aria-label="Mark paid manually"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                          {isMarking ? 'Saving…' : 'Mark paid'}
                        </button>
                      </div>
                    </div>
                    {/* Inline mark-paid confirmation */}
                    {markPaidForm?.invoiceId === inv.id && (
                      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold">Confirm Payment</p>
                          <button onClick={() => setMarkPaidForm(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </div>
                        <select
                          value={markPaidForm.mode}
                          onChange={(e) => setMarkPaidForm((f) => f ? { ...f, mode: e.target.value } : f)}
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                        >
                          {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].map((m) => (
                            <option key={m} value={m}>{m.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Reference / UTR (optional)"
                          value={markPaidForm.ref}
                          onChange={(e) => setMarkPaidForm((f) => f ? { ...f, ref: e.target.value } : f)}
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                        />
                        <button
                          onClick={() => markPaid(inv)}
                          disabled={isMarking}
                          className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold disabled:opacity-60"
                        >
                          {isMarking ? 'Saving…' : 'Confirm Paid'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overdue total banner */}
        {(overdueTotal > 0 || allOutstandingTotal > 0) && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
            <div className="flex justify-between text-sm text-orange-700 font-medium">
              <span>Outstanding ({monthLabel(month, year)})</span>
              <span>{formatCurrency(overdueTotal)}</span>
            </div>
            {allOutstandingTotal !== overdueTotal && (
              <div className="flex justify-between text-xs text-orange-600 mt-1">
                <span>All outstanding</span>
                <span>{formatCurrency(allOutstandingTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium w-32 text-center">{monthLabel(month, year)}</span>
            <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{invoices.length} invoices</span>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', 'OVERDUE', 'PENDING', 'PARTIAL', 'PAID'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={3} />)
          ) : invoices.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              {statusFilter === 'PAID' || !statusFilter
                ? 'All caught up! 🎉'
                : `No ${statusFilter.toLowerCase()} invoices.`}
            </p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                <button
                  onClick={() => router.push(`/rent/${inv.id}`)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-medium">{inv.tenant.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.tenant.bed.room.property.code} · Due {formatDate(inv.dueDate)}
                  </p>
                  <p className="text-xs font-semibold mt-0.5">
                    {formatCurrency(Number(inv.amountPaid))} / {formatCurrency(Number(inv.amountDue))}
                  </p>
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>
                    {inv.status}
                  </span>
                  {(inv.status === 'OVERDUE' || inv.status === 'PENDING') && (
                    <button
                      onClick={() => sendReminder(inv)}
                      disabled={sendingReminder === inv.id}
                      className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                      aria-label="Send WhatsApp reminder"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}