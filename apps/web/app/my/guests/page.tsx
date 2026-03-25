'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonList } from '@/components/shared/PageLoader';
import { Plus, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

interface Guest {
  id: string; visitorName: string; visitorPhone: string | null;
  expectedIn: string; expectedOut: string | null;
  actualOut: string | null; notes: string | null;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TenantGuestsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visitorName: '', visitorPhone: '', expectedIn: '', expectedOut: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['my-guests'],
    queryFn: () => api.get<{ success: boolean; data: Guest[] }>('/guests/me').then((r) => r.data.data),
  });

  const register = useMutation({
    mutationFn: () => api.post('/guests', {
      visitorName: form.visitorName,
      visitorPhone: form.visitorPhone || undefined,
      expectedIn: form.expectedIn,
      expectedOut: form.expectedOut || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Guest registered');
      setShowForm(false);
      setForm({ visitorName: '', visitorPhone: '', expectedIn: '', expectedOut: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['my-guests'] });
    },
    onError: () => toast.error('Failed to register guest'),
  });

  const canSubmit = form.visitorName.trim() && form.expectedIn;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Guests" />

      <div className="p-4 space-y-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Register a Guest
        </button>

        {showForm && (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Guest Details</p>

            {[
              { label: 'Visitor Name *', key: 'visitorName', type: 'text', placeholder: 'Full name' },
              { label: 'Phone (optional)', key: 'visitorPhone', type: 'tel', placeholder: '10-digit number' },
              { label: 'Expected Check-in *', key: 'expectedIn', type: 'date', placeholder: '' },
              { label: 'Expected Check-out', key: 'expectedOut', type: 'date', placeholder: '' },
              { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Relationship, purpose, etc.' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => register.mutate()}
                disabled={!canSubmit || register.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-60"
              >
                {register.isPending ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        )}

        {isLoading && <SkeletonList rows={4} />}

        {!isLoading && (!data || data.length === 0) && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-12">No guests registered yet.</p>
        )}

        {data?.map((guest) => (
          <div key={guest.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{guest.visitorName}</p>
                {guest.visitorPhone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{guest.visitorPhone}</p>
                )}
              </div>
              {guest.actualOut
                ? <UserX className="w-4 h-4 text-muted-foreground shrink-0" />
                : <UserCheck className="w-4 h-4 text-green-500 shrink-0" />}
            </div>

            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              <p>In: {fmt(guest.expectedIn)}</p>
              {guest.expectedOut && <p>Expected out: {fmt(guest.expectedOut)}</p>}
              {guest.actualOut && <p>Checked out: {fmt(guest.actualOut)}</p>}
              {guest.notes && <p className="mt-1 italic">{guest.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
