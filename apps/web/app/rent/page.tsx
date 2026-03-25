'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, MessageCircle } from 'lucide-react';
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
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: InvoiceItem[] }>({
    queryKey: ['invoices', month, year, statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/invoices', {
        params: { month, year, status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
    // D19: financial data — no stale cache
    staleTime: 0,
  });

  const invoices = data?.data ?? [];

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
      toast.success('WhatsApp reminder sent ✓');
    } catch {
      toast.error('Could not send reminder. Check Gupshup config.');
    } finally {
      setSendingReminder(null);
    }
  };

  const overdueTotal = invoices
    .filter((i) => i.status === 'OVERDUE' || i.status === 'PENDING')
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  return (
    <div>
      <Header title="Rent & Invoices" />
      <div className="px-4 py-4 space-y-4">

        {/* Overdue banner */}
        {overdueTotal > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
            <p className="text-sm text-red-600 font-medium">Outstanding: {formatCurrency(overdueTotal)}</p>
          </div>
        )}

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium w-32 text-center">{monthLabel(month, year)}</span>
            <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <span className="text-xs text-muted-foreground">{invoices.length} invoices</span>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', 'OVERDUE', 'PENDING', 'PARTIAL', 'PAID'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3,4].map(i => <SkeletonRow key={i} cols={3} />)
          ) : invoices.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              {statusFilter === 'PAID' || !statusFilter ? 'All caught up! 🎉' : `No ${statusFilter.toLowerCase()} invoices.`}
            </p>
          ) : invoices.map((inv) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
