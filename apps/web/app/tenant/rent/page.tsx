'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react';
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
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportAmount, setReportAmount] = useState('');
  const [reportMode, setReportMode] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [reportNotes, setReportNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: () => api.get<{ success: boolean; data: Invoice[] }>('/invoices/my').then(r => r.data.data),
    refetchInterval: 15_000,
  });

  const invoices = data ?? [];
  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  const openReportForm = (invoice: Invoice) => {
    const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
    setReportAmount(remaining.toString());
    setReportMode('UPI');
    setReportNotes('');
    setReportingId(invoice.id);
    setExpandedId(invoice.id);
  };

  const submitPayment = async (invoiceId: string) => {
    const amount = parseFloat(reportAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      await api.post('/payments/self-report', {
        invoiceId, amount, mode: reportMode,
        notes: reportNotes || undefined,
      });
      toast.success('Payment submitted — awaiting staff approval');
      setReportingId(null);
      qc.invalidateQueries({ queryKey: ['tenant-invoices'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
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
        ) : invoices.map(invoice => {
          const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
          const isExpanded = expandedId === invoice.id;
          const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.PENDING;
          const pendingPayment = invoice.payments.find(p => p.status === 'PENDING_APPROVAL');
          const isReporting = reportingId === invoice.id;

          return (
            <div key={invoice.id} className="rounded-xl border bg-card overflow-hidden">
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
                <div className="flex items-center gap-2">
                  {pendingPayment && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Pending approval
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

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

                  {invoice.notes && <p className="text-xs text-muted-foreground">{invoice.notes}</p>}

                  {invoice.payments.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment History</p>
                      {invoice.payments.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {p.mode}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-700">+{formatCurrency(p.amount)}</span>
                            {p.status === 'PENDING_APPROVAL' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                            )}
                            {p.status === 'REJECTED' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {invoice.status !== 'PAID' && remaining > 0 && !pendingPayment && (
                    isReporting ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                        <p className="text-xs font-semibold text-primary">Report your payment</p>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Amount paid (₹)</label>
                            <input
                              type="number"
                              value={reportAmount}
                              onChange={e => setReportAmount(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Payment method</label>
                            <select
                              value={reportMode}
                              onChange={e => setReportMode(e.target.value as any)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background"
                            >
                              <option value="UPI">UPI</option>
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Note (optional, e.g. UPI ref)</label>
                            <input
                              type="text"
                              value={reportNotes}
                              onChange={e => setReportNotes(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitPayment(invoice.id)}
                            disabled={submitting}
                            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
                          >
                            {submitting ? 'Submitting…' : 'Submit for approval'}
                          </button>
                          <button
                            onClick={() => setReportingId(null)}
                            className="px-4 rounded-lg border text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openReportForm(invoice)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold"
                      >
                        <IndianRupee className="w-4 h-4" />
                        I've paid — report payment
                      </button>
                    )
                  )}

                  {pendingPayment && invoice.status !== 'PAID' && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-blue-700">
                      <Clock className="w-4 h-4 shrink-0" />
                      {formatCurrency(pendingPayment.amount)} submitted — waiting for staff approval
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}