'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import toast from 'react-hot-toast';

interface GuestLog {
  id: string;
  visitorName: string;
  visitorPhone: string | null;
  expectedIn: string;
  expectedOut: string | null;
  actualOut: string | null;
  notes: string | null;
}

export default function TenantGuestsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    visitorName: '',
    visitorPhone: '',
    expectedIn: '',
    expectedOut: '',
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-guests'],
    queryFn: () => api.get<{ success: boolean; data: GuestLog[] }>('/guests/me').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/guests', {
      visitorName: form.visitorName.trim(),
      visitorPhone: form.visitorPhone.trim() || undefined,
      expectedIn: form.expectedIn,
      expectedOut: form.expectedOut || undefined,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-guests'] });
      setShowForm(false);
      setForm({ visitorName: '', visitorPhone: '', expectedIn: '', expectedOut: '', notes: '' });
      toast.success('Guest registered!');
    },
    onError: () => toast.error('Failed to register guest. Try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error('Enter visitor name'); return; }
    if (!form.expectedIn) { toast.error('Enter expected arrival time'); return; }
    createMutation.mutate();
  };

  const guests = data ?? [];

  const formatTime = (dt: string) =>
    new Date(dt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (isLoading) return (
    <div className="pb-20">
      <Header title="Guests" />
      <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Guests" />

      <div className="p-4 space-y-4">
        {showForm ? (
          <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Register Guest</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">Visitor Name *</label>
              <input
                type="text"
                value={form.visitorName}
                onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))}
                placeholder="Full name"
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Visitor Phone</label>
              <input
                type="tel"
                value={form.visitorPhone}
                onChange={e => setForm(f => ({ ...f, visitorPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="10-digit number (optional)"
                inputMode="numeric"
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Expected Arrival *</label>
                <input
                  type="datetime-local"
                  value={form.expectedIn}
                  onChange={e => setForm(f => ({ ...f, expectedIn: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Expected Departure</label>
                <input
                  type="datetime-local"
                  value={form.expectedOut}
                  onChange={e => setForm(f => ({ ...f, expectedOut: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Purpose of visit (optional)"
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {createMutation.isPending ? 'Registering...' : 'Register Guest'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-xl py-3.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Guest
          </button>
        )}

        {guests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No guests registered yet</div>
        ) : (
          guests.map(g => (
            <div key={g.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{g.visitorName}</p>
                    {g.visitorPhone && <p className="text-xs text-muted-foreground">{g.visitorPhone}</p>}
                  </div>
                </div>
                {g.actualOut ? (
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Left</span>
                ) : (
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5 pl-11">
                <p>In: {formatTime(g.expectedIn)}</p>
                {g.expectedOut && <p>Out: {formatTime(g.expectedOut)}</p>}
                {g.notes && <p className="italic">{g.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
