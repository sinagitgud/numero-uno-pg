'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, ChevronRight, FileText, LogOut, AlertTriangle, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { formatCurrency, formatDate, monthLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface TenantDetail {
  id: string;
  rate: number;
  checkIn: string;
  checkOut?: string;
  status: string;
  securityExpected: number;
  securityReceived: number;
  user: { name: string; phone?: string | null; email?: string | null };
  bed: { label: string; room: { number: string; property: { name: string } } };
  invoices: Array<{ id: string; month: number; year: number; amountDue: number; amountPaid: number; status: string }>;
  supportTickets: Array<{ id: string; category: string; description: string; status: string; createdAt: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'text-green-600',
  PARTIAL: 'text-yellow-600',
  PENDING: 'text-orange-500',
  OVERDUE: 'text-red-500',
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const token = useAuthStore((s) => s.token);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    checkOut: new Date().toISOString().split('T')[0],
    securityToReturn: '',
  });

  const { data: tenant, isLoading } = useQuery<TenantDetail>({
    queryKey: ['tenant', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: TenantDetail }>(`/tenants/${id}`);
      return data.data;
    },
  });

  const noticeM = useMutation({
    mutationFn: () => api.patch(`/tenants/${id}`, { status: 'NOTICE_PERIOD' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant', id] }); toast.success('Marked as notice period'); },
    onError: () => toast.error('Failed to update status'),
  });

  const checkoutM = useMutation({
    mutationFn: () => api.post(`/tenants/${id}/checkout`, {
      checkOut: checkoutForm.checkOut,
      securityToReturn: Number(checkoutForm.securityToReturn),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] });
      setShowCheckout(false);
      toast.success('Tenant checked out');
    },
    onError: () => toast.error('Checkout failed'),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!tenant) {
    return <p className="px-4 py-8 text-sm text-muted-foreground text-center">Tenant not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-semibold text-sm">{tenant.user.name}</h1>
          <p className="text-xs text-muted-foreground">{tenant.bed.room.property.name} · Room {tenant.bed.room.number} · Bed {tenant.bed.label}</p>
        </div>
        {tenant.user.phone && (
          <a href={`tel:${tenant.user.phone}`} className="ml-auto p-2 rounded-lg bg-muted">
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Profile */}
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Rent</span>
            <span className="font-semibold">{formatCurrency(tenant.rate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Check-in</span>
            <span>{formatDate(tenant.checkIn)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Security Received</span>
            <span>{formatCurrency(tenant.securityReceived)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Security Expected</span>
            <span>{formatCurrency(tenant.securityExpected)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium ${tenant.status === 'ACTIVE' ? 'text-green-600' : tenant.status === 'NOTICE_PERIOD' ? 'text-yellow-600' : 'text-muted-foreground'}`}>{tenant.status.replace('_', ' ')}</span>
          </div>
          {role === 'OWNER' && (
            <div className="pt-2 border-t">
              <button
                onClick={async () => {
                  if (downloadingAgreement) return;
                  setDownloadingAgreement(true);
                  try {
                    const res = await api.get(`/tenants/${id}/agreement`, {
                      responseType: 'blob',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `agreement-${tenant.user.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch {
                    toast.error('Could not generate agreement');
                  } finally {
                    setDownloadingAgreement(false);
                  }
                }}
                disabled={downloadingAgreement}
                className="flex items-center gap-2 text-sm text-primary font-medium disabled:opacity-50"
              >
                {downloadingAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {downloadingAgreement ? 'Generating…' : 'Download Rent Agreement'}
              </button>
            </div>
          )}
        </section>

        {/* Invoices */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Invoices</h2>
          <div className="rounded-xl border overflow-hidden">
            {tenant.invoices.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No invoices yet.</p>
            ) : tenant.invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/rent/${inv.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/50 text-left"
              >
                <div>
                  <p className="text-sm font-medium">{monthLabel(inv.month, inv.year)}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(inv.amountPaid)} / {formatCurrency(inv.amountDue)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${STATUS_COLOR[inv.status] || ''}`}>{inv.status.replace(/_/g, ' ')}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent tickets */}
        {tenant.supportTickets.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Tickets</h2>
            <div className="rounded-xl border overflow-hidden">
              {tenant.supportTickets.map((t) => (
                <button key={t.id} onClick={() => router.push(`/tickets?id=${t.id}`)} className="w-full flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/50 text-left">
                  <div>
                    <p className="text-sm font-medium">{t.category}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{t.status}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Actions — ACTIVE or NOTICE_PERIOD */}
        {(tenant.status === 'ACTIVE' || tenant.status === 'NOTICE_PERIOD') && (
          <section className="space-y-3 pb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</h2>

            {tenant.status === 'ACTIVE' && (
              <button
                onClick={() => noticeM.mutate()}
                disabled={noticeM.isPending}
                className="w-full flex items-center justify-center gap-2 border border-yellow-400 text-yellow-700 bg-yellow-50 rounded-xl py-3 text-sm font-medium disabled:opacity-60"
              >
                {noticeM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Mark as Notice Period
              </button>
            )}

            {!showCheckout ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 bg-red-50 rounded-xl py-3 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Check Out Tenant
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-700">Confirm Check Out</p>
                  <button onClick={() => setShowCheckout(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Check-out Date</label>
                  <input
                    type="date"
                    value={checkoutForm.checkOut}
                    onChange={(e) => setCheckoutForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Security to Return (₹)</label>
                  <input
                    type="number"
                    value={checkoutForm.securityToReturn}
                    onChange={(e) => setCheckoutForm((f) => ({ ...f, securityToReturn: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300 bg-background"
                    placeholder={String(tenant.securityReceived)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCheckout(false)} className="flex-1 border rounded-lg py-2.5 text-sm">Cancel</button>
                  <button
                    onClick={() => checkoutM.mutate()}
                    disabled={checkoutM.isPending}
                    className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {checkoutM.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Checkout
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
