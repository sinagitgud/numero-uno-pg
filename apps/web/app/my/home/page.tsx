'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/shared/PageLoader';
import { formatCurrency } from '@/lib/utils';
import { Home, CreditCard, Ticket, Users, CalendarRange, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TenantMe {
  id: string;
  checkIn: string;
  rate: number;
  bed: {
    label: string;
    room: { number: string; property: { name: string; address: string } };
  };
  invoices: Array<{
    id: string; month: number; year: number;
    amountDue: number; amountPaid: number; status: string;
  }>;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PAID:    'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    OVERDUE: 'bg-red-100 text-red-700',
    PENDING: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function TenantHomePage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => api.get<{ success: boolean; data: TenantMe }>('/tenants/me').then((r) => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  const tenant = data;
  const now = new Date();
  const currentInvoice = tenant?.invoices.find(
    (inv) => inv.month === now.getMonth() + 1 && inv.year === now.getFullYear()
  );
  const outstanding = tenant?.invoices
    .filter((inv) => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + (Number(inv.amountDue) - Number(inv.amountPaid)), 0) ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Home" />

      <div className="p-4 space-y-4">
        {/* Welcome card */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-5">
          <p className="text-sm opacity-80">Welcome back</p>
          <h2 className="text-xl font-bold mt-0.5">{user?.name}</h2>
          {tenant && (
            <div className="mt-3 text-sm opacity-90 space-y-0.5">
              <p>{tenant.bed.room.property.name}</p>
              <p>Room {tenant.bed.room.number} · Bed {tenant.bed.label}</p>
              <p className="mt-1 font-semibold">{formatCurrency(tenant.rate)} / month</p>
            </div>
          )}
        </div>

        {/* Current month rent status */}
        {currentInvoice ? (
          <Link href="/my/rent" className="block bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {MONTH_NAMES[currentInvoice.month - 1]} {currentInvoice.year} Rent
                </p>
                <p className="text-lg font-bold mt-0.5">{formatCurrency(currentInvoice.amountDue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paid: {formatCurrency(currentInvoice.amountPaid)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(currentInvoice.status)}`}>
                  {currentInvoice.status}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">No invoice for this month yet.</p>
          </div>
        )}

        {/* Outstanding balance */}
        {outstanding > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-600 font-medium">Outstanding Balance</p>
            <p className="text-lg font-bold text-red-700 mt-0.5">{formatCurrency(outstanding)}</p>
            <p className="text-xs text-red-500 mt-1">Please clear dues to avoid late fees.</p>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/my/rent',    label: 'Rent History', icon: <CreditCard className="w-5 h-5" />,   color: 'text-blue-600 bg-blue-50' },
            { href: '/my/tickets', label: 'Support',      icon: <Ticket className="w-5 h-5" />,        color: 'text-purple-600 bg-purple-50' },
            { href: '/my/guests',  label: 'Guest Log',    icon: <Users className="w-5 h-5" />,          color: 'text-green-600 bg-green-50' },
            { href: '/my/leave',   label: 'Leave',        icon: <CalendarRange className="w-5 h-5" />,  color: 'text-orange-600 bg-orange-50' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-card border rounded-xl p-4 flex flex-col items-start gap-2 hover:bg-muted/50 transition-colors"
            >
              <span className={`p-2 rounded-lg ${item.color}`}>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Property address */}
        {tenant && (
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Home className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{tenant.bed.room.property.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tenant.bed.room.property.address}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
