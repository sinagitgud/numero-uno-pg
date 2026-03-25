'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonList } from '@/components/shared/PageLoader';
import { formatCurrency } from '@/lib/utils';
import { Download, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Payment { id: string; amount: number; date: string; mode: string }
interface Invoice {
  id: string; month: number; year: number;
  amountDue: number; amountPaid: number; status: string;
  payments: Payment[];
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function StatusIcon({ status }: { status: string }) {
  if (status === 'PAID')    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'OVERDUE') return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === 'PARTIAL') return <Clock className="w-4 h-4 text-yellow-500" />;
  return <Circle className="w-4 h-4 text-gray-400" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PAID:    'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    OVERDUE: 'bg-red-100 text-red-700',
    PENDING: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function TenantRentPage() {
  const token = useAuthStore((s) => s.token);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () =>
      api.get<{ success: boolean; data: Invoice[] }>('/invoices/my').then((r) => r.data.data),
    staleTime: 0,
  });

  const handleDownload = async (invoice: Invoice) => {
    if (downloading) return;
    setDownloading(invoice.id);
    try {
      const res = await api.get(`/invoices/${invoice.id}/receipt`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${invoice.month}-${invoice.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not generate receipt');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Rent" />

      <div className="p-4 space-y-3">
        {isLoading && <SkeletonList rows={5} />}

        {!isLoading && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-12">No invoices yet.</p>
        )}

        {data?.map((inv) => (
          <div key={inv.id} className="bg-card border rounded-xl p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon status={inv.status} />
                <span className="font-medium text-sm">
                  {MONTH_NAMES[inv.month - 1]} {inv.year}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(inv.status)}`}>
                {inv.status}
              </span>
            </div>

            {/* Amount row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold">{formatCurrency(inv.amountDue)}</p>
                {Number(inv.amountPaid) > 0 && Number(inv.amountPaid) < Number(inv.amountDue) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paid: {formatCurrency(inv.amountPaid)} ·{' '}
                    Due: {formatCurrency(Number(inv.amountDue) - Number(inv.amountPaid))}
                  </p>
                )}
              </div>

              {/* Download receipt — only for invoices with payments */}
              {inv.payments.length > 0 && (
                <button
                  onClick={() => handleDownload(inv)}
                  disabled={downloading === inv.id}
                  className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading === inv.id ? 'Downloading…' : 'Receipt'}
                </button>
              )}
            </div>

            {/* Payment history */}
            {inv.payments.length > 0 && (
              <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Payments</p>
                {inv.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{p.mode}
                    </span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
