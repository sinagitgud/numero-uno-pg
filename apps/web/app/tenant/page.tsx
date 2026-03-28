'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CreditCard, AlertCircle, CheckCircle2, Clock, UserCheck, CalendarOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { formatCurrency } from '@/lib/utils';

interface TenantProfile {
  id: string;
  name: string;
  phone: string;
  tenant: {
    rate: number;
    checkIn: string;
    status: string;
    discount: number;
    securityExpected: number;
    securityReceived: number;
    bed: {
      label: string;
      room: {
        number: string;
        isAc: boolean;
        property: {
          name: string;
          address: string;
          wifiDetails: string | null;
          houseRules: string | null;
          mealSchedule: string | null;
        };
      };
    };
  } | null;
}

interface Invoice {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PAID:    { label: 'Paid',    color: 'text-green-600 bg-green-50',  icon: <CheckCircle2 className="w-4 h-4" /> },
  PENDING: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50', icon: <Clock className="w-4 h-4" /> },
  PARTIAL: { label: 'Partial', color: 'text-blue-600 bg-blue-50',    icon: <AlertCircle className="w-4 h-4" /> },
  OVERDUE: { label: 'Overdue', color: 'text-red-600 bg-red-50',      icon: <AlertCircle className="w-4 h-4" /> },
};

export default function TenantHomePage() {
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => api.get<{ success: boolean; data: TenantProfile }>('/auth/me').then(r => r.data.data),
  });

  const { data: invoicesData, isLoading: invLoading } = useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: () => api.get<{ success: boolean; data: Invoice[] }>('/invoices/my').then(r => r.data.data),
  });

  const profile = meData;
  const tenant = profile?.tenant;
  const invoices = invoicesData ?? [];
  const latestInvoice = invoices[0];
  const outstanding = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + (Number(i.amountDue) - Number(i.amountPaid)), 0);

  if (meLoading) return (
    <div className="pb-20">
      <Header title="Home" />
      <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Home" />

      <div className="p-4 space-y-4">
        {/* Welcome card */}
        <div className="rounded-xl bg-primary text-primary-foreground p-5">
          <p className="text-sm opacity-80">Welcome back</p>
          <h2 className="text-xl font-bold mt-0.5">{profile?.name}</h2>
          {tenant && (
            <div className="mt-3 text-sm opacity-90 space-y-0.5">
              <p>{tenant.bed.room.property.name}</p>
              <p>Room {tenant.bed.room.number} · Bed {tenant.bed.label}{tenant.bed.room.isAc ? ' · AC' : ''}</p>
            </div>
          )}
        </div>

        {!tenant && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            Your stay details haven't been set up yet. Contact your property manager.
          </div>
        )}

        {tenant && (
          <>
            {/* Rent summary — tappable */}
            <Link href="/tenant/rent" className="block rounded-xl border p-4 space-y-3 hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 font-semibold">
                <CreditCard className="w-4 h-4 text-primary" />
                Rent
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="text-lg font-bold mt-0.5">{formatCurrency(tenant.rate)}</p>
                </div>
                <div className={`rounded-lg p-3 ${outstanding > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className={`text-lg font-bold mt-0.5 ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(outstanding)}
                  </p>
                </div>
              </div>

              {latestInvoice && !invLoading && (
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-sm text-muted-foreground">
                    {MONTH_NAMES[latestInvoice.month - 1]} {latestInvoice.year}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[latestInvoice.status]?.color}`}>
                    {STATUS_CONFIG[latestInvoice.status]?.icon}
                    {STATUS_CONFIG[latestInvoice.status]?.label}
                  </span>
                </div>
              )}
            </Link>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/tenant/guests" className="flex items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Guests</p>
                  <p className="text-xs text-muted-foreground">Add visitor</p>
                </div>
              </Link>
              <Link href="/tenant/leave" className="flex items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarOff className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Leave</p>
                  <p className="text-xs text-muted-foreground">Request leave</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
