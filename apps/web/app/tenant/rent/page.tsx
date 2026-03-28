'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Payment {
  id: string;
  amount: number;
  date: string;
  mode: string;
}

interface Invoice {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  notes: string | null;
  payments: Payment[];
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PAID:    { label: 'Paid',    color: 'text-green-700 bg-green-100', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  PENDING: { label: 'Pending', color: 'text-yellow-700 bg-yellow-100', icon: <Clock className="w-3.5 h-3.5" /> },
  PARTIAL: { label: 'Partial', color: 'text-blue-700 bg-blue-100',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  OVERDUE: { label: 'Overdue', color: 'text-red-700 bg-red-100',     icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function TenantRentPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: () => api.get<{ success: boolean; data: Invoice[] }>('/invoices/my').then(r => r.data.data),
  });

  const invoices = data ?? [];
  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  const handlePayOnline = async (invoice: Invoice) => {
    setPayingId(invoice.id);
    try {
      const res = await api.post<{ success: boolean; data: { short_url?: string; razorpayActive: boolean } }>(
        '/payments/razorpay-order',
        { invoiceId: invoice.id }
      );
      const { short_url, razorpayActive } = res.data.data;
      if (!razorpayActive) {
        toast('Razorpay not configured. Contact your property manager.', { icon: 'ℹ️' });
        return;
      }
      if (short_url) {
        window.open(short_url, '_blank');
      } else {
        toast.error('Payment link not available. Try again.');
      }
    } catch {
      toast.error('Failed to generate payment link. Try again.');
    } finally {
      setPayingId(null);
    }
  };

  if (isLoading) return (
    <div className="pb-20">
      <Header title="Rent & Invoices" />
      <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Rent & Invoices" />

      <div className="p-4 space-y-4">
        {totalOutstanding > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium">Total Outstanding</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No invoices yet</div>
        ) : (
          invoices.map(invoice => {
            const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
            const isExpanded = expandedId === invoice.id;
            const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.PENDING;

            return (
              <div key={invoice.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Header row */}
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                >
                  <div>
                    <p className="font-semibold">{MONTH_NAMES[invoice.month - 1]} {invoice.year}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-muted rounded-lg p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Due</p>
                        <p className="font-semibold">{formatCurrency(invoice.amountDue)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-green-700">{formatCurrency(invoice.amountPaid)}</p>
                      </div>
                      <div className={`rounded-lg p-2.5 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={`font-semibold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(remaining)}</p>
                      </div>
                    </div>

                    {invoice.notes && (
                      <p className="text-xs text-muted-foreground">{invoice.notes}</p>
                    )}

                    {invoice.payments.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment History</p>
                        {invoice.payments.map(p => (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {p.mode}
                            </span>
                            <span className="font-medium text-green-700">+{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {invoice.status !== 'PAID' && remaining > 0 && (
                      <button
                        onClick={() => handlePayOnline(invoice)}
                        disabled={payingId === invoice.id}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {payingId === invoice.id ? 'Opening...' : `Pay ${formatCurrency(remaining)} Online`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
