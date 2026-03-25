'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate } from '@/lib/utils';

interface GuestItem {
  id: string;
  visitorName: string;
  visitorPhone?: string | null;
  expectedIn: string;
  expectedOut?: string | null;
  actualOut?: string | null;
  notes?: string | null;
  tenant: { user: { name: string } };
}

function nightsBetween(from: string, to?: string | null): number {
  if (!to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function GuestsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(today);

  const { data, isLoading } = useQuery<GuestItem[]>({
    queryKey: ['guests', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: GuestItem[] }>('/guests', {
        params: { dateFrom, dateTo },
      });
      return data.data ?? [];
    },
  });

  const guests = data ?? [];

  return (
    <div>
      <Header title="Guests" />
      <div className="px-4 py-4 space-y-4">

        {/* Date filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
          </div>
        </div>

        {/* Guest list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : guests.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No guests in this period.</p>
          ) : guests.map((g) => {
            const checkOut = g.actualOut || g.expectedOut;
            const nights = nightsBetween(g.expectedIn, checkOut);
            return (
              <div key={g.id} className="px-4 py-3 border-b last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{g.visitorName}</p>
                    <p className="text-xs text-muted-foreground">Guest of {g.tenant.user.name}</p>
                    {g.visitorPhone && <p className="text-xs text-muted-foreground">{g.visitorPhone}</p>}
                    {g.notes && <p className="text-xs text-muted-foreground line-clamp-1">{g.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDate(g.expectedIn)}</p>
                    {checkOut ? (
                      <>
                        <p className="text-xs text-muted-foreground">→ {formatDate(checkOut)}</p>
                        {nights > 0 && <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>}
                      </>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Checked in</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
