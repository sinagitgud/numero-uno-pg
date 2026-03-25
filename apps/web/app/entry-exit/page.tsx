'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Search, Loader2, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  user: { name: string };
  bed: { label: string; room: { number: string } };
}

interface LogEntry {
  id: string;
  direction: 'IN' | 'OUT';
  loggedAt: string;
  notes?: string | null;
  tenant: { user: { name: string }; bed: { room: { number: string } } };
  logger: { name: string };
}

export default function EntryExitPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingDirection, setPendingDirection] = useState<'IN' | 'OUT' | null>(null);

  // Today's log
  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ['entry-exit', date],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: LogEntry[] }>('/entry-exit', { params: { date } });
      return data.data ?? [];
    },
  });

  // Tenant search
  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ['tenants-active-list'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Tenant[] }>('/tenants', {
        params: { status: 'ACTIVE', limit: 200 },
      });
      return data.data ?? [];
    },
  });

  const filtered = (tenants ?? []).filter((t) =>
    t.user.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.bed.room.number.includes(tenantSearch)
  );

  const { mutate: logEntry, isPending } = useMutation({
    mutationFn: async ({ tenantId, direction }: { tenantId: string; direction: 'IN' | 'OUT' }) => {
      await api.post('/entry-exit', { tenantId, direction, notes: notes || undefined });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['entry-exit', date] });
      toast.success(`${vars.direction === 'IN' ? 'Check-in' : 'Check-out'} logged`);
      setSelectedTenant(null);
      setTenantSearch('');
      setNotes('');
      setPendingDirection(null);
    },
    onError: () => toast.error('Failed to log entry'),
  });

  const handleLog = (direction: 'IN' | 'OUT') => {
    if (!selectedTenant) return;
    logEntry({ tenantId: selectedTenant.id, direction });
  };

  const logCount = logs ?? [];
  const insToday = logCount.filter((l) => l.direction === 'IN').length;
  const outsToday = logCount.filter((l) => l.direction === 'OUT').length;

  return (
    <div>
      <Header title="Entry / Exit Log" />
      <div className="px-4 py-4 space-y-4">

        {/* Date selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{insToday}</p>
              <p className="text-[10px] text-muted-foreground">IN</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-500">{outsToday}</p>
              <p className="text-[10px] text-muted-foreground">OUT</p>
            </div>
          </div>
        </div>

        {/* Log action — tenant picker + IN/OUT buttons */}
        {date === today && (
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-semibold">Log Entry / Exit</p>

            {/* Tenant search */}
            <div className="relative">
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-background">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  placeholder="Search tenant by name or room..."
                  value={selectedTenant ? selectedTenant.user.name : tenantSearch}
                  onFocus={() => { setShowDropdown(true); if (selectedTenant) { setTenantSearch(''); setSelectedTenant(null); } }}
                  onChange={(e) => { setTenantSearch(e.target.value); setShowDropdown(true); }}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
                {selectedTenant && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              {showDropdown && tenantSearch && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-md max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No tenants found</p>
                  ) : filtered.slice(0, 10).map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted border-b last:border-0"
                      onClick={() => { setSelectedTenant(t); setTenantSearch(''); setShowDropdown(false); }}
                    >
                      <span className="font-medium">{t.user.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">Room {t.bed.room.number} · Bed {t.bed.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTenant && (
              <>
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium">{selectedTenant.user.name}</p>
                  <p className="text-xs text-muted-foreground">Room {selectedTenant.bed.room.number} · Bed {selectedTenant.bed.label}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Late return, visitor with"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleLog('IN')}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Check In
                  </button>
                  <button
                    onClick={() => handleLog('OUT')}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Check Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Log list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={3} />)
          ) : logCount.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">No entries logged for this date.</p>
          ) : logCount.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded-full ${log.direction === 'IN' ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {log.direction === 'IN'
                    ? <LogIn className="w-3.5 h-3.5 text-green-600" />
                    : <LogOut className="w-3.5 h-3.5 text-orange-500" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{log.tenant.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Room {log.tenant.bed.room.number}
                    {log.notes && ` · ${log.notes}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${log.direction === 'IN' ? 'text-green-600' : 'text-orange-500'}`}>
                  {log.direction}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.loggedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
