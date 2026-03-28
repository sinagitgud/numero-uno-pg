'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
    refetchInterval: 10_000,
  });

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
    refetchInterval: 10_000,
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
    setMarkingPaid(invoice.id);
    try {
      await api.post('/payments', {
        invoiceId: invoice.id,
        amount: Number(invoice.amountDue) - Number(invoice.amountPaid),
        date: new Date().toISOString().split('T')[0],
        mode: 'CASH',
        notes: 'Marked paid manually by staff',
      });
      toast.success('Marked as paid ✓');
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

  return (
    <div>
      <Header title="Rent & Invoices" />
      <div className="px-4 py-4 space-y-4">

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
                  <div key={inv.id} className="px-4 py-3">
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overdue total banner (for current month filter) */}
        {overdueTotal > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-center">
            <p className="text-sm text-orange-700 font-medium">
              Outstanding this month: {formatCurrency(overdueTotal)}
            </p>
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