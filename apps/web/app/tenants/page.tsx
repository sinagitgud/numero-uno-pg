'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate } from '@/lib/utils';

interface TenantItem {
  id: string;
  rate: number;
  checkIn: string;
  status: 'ACTIVE' | 'NOTICE_PERIOD' | 'VACATED';
  user: { name: string; phone?: string | null };
  bed: { label: string; room: { number: string; property: { name: string; code: string } } };
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  NOTICE_PERIOD: 'Notice',
  VACATED: 'Vacated',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  NOTICE_PERIOD: 'bg-yellow-100 text-yellow-700',
  VACATED: 'bg-gray-100 text-gray-500',
};

export default function TenantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const { data, isLoading, error } = useQuery<{ data: TenantItem[]; total: number }>({
    queryKey: ['tenants', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/tenants', { params: { status: statusFilter || undefined, limit: 100 } });
      return data;
    },
  });

  const tenants = (data?.data ?? []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.user.name.toLowerCase().includes(q) ||
      t.user.phone?.includes(q) ||
      t.bed.room.property.name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Header title="Tenants" />
      <div className="px-4 py-4 space-y-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', 'ACTIVE', 'NOTICE_PERIOD', 'VACATED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {s === '' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3,4,5].map(i => <SkeletonRow key={i} cols={3} />)
          ) : error ? (
            <p className="px-4 py-6 text-sm text-destructive text-center">Failed to load tenants. Tap to retry.</p>
          ) : tenants.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              {search ? 'No matches found.' : 'No tenants yet. Tap + to onboard your first tenant.'}
            </p>
          ) : (
            tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/tenants/${t.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{t.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.bed.room.property.code} · Room {t.bed.room.number} · Bed {t.bed.label}
                  </p>
                  <p className="text-xs text-muted-foreground">Since {formatDate(t.checkIn)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/tenants/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label="Onboard tenant"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
