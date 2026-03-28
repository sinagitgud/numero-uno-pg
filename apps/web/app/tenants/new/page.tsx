'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { z } from 'zod';

// ── Step state ────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface FormData {
  // Step 1: Tenant info
  name: string;
  phone: string;
  // Step 2: Bed selection
  propertyId: string;
  bedId: string;
  // Step 3: Financial
  rate: string;
  checkIn: string;
  securityExpected: string;
  securityReceived: string;
  discount: string;
  remarks: string;
}

const INITIAL: FormData = {
  name: '', phone: '',
  propertyId: '', bedId: '',
  rate: '', checkIn: new Date().toISOString().split('T')[0],
  securityExpected: '', securityReceived: '', discount: '', remarks: '',
};

interface Property {
  id: string; name: string; code: string;
  rooms: Array<{ id: string; number: string; beds: Array<{ id: string; label: string; status: string }> }>;
}

export default function NewTenantPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties-for-onboard'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Property[] }>('/properties', {
        params: { includeRooms: true, limit: 50 },
      });
      return data.data ?? [];
    },
  });

  const set = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validateStep = (): boolean => {
    const errs: typeof errors = {};
    if (step === 1) {
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit phone number';
    }
    if (step === 2) {
      if (!form.propertyId) errs.propertyId = 'Select a property';
      if (!form.bedId) errs.bedId = 'Select a bed';
    }
    if (step === 3) {
      const rate = Number(form.rate);
      if (!rate || rate <= 0) errs.rate = 'Enter a valid rent amount';
      if (!form.checkIn) errs.checkIn = 'Select check-in date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const selectedProperty = properties.find((p) => p.id === form.propertyId);
  const vacantBeds = selectedProperty?.rooms.flatMap((r) =>
    r.beds.filter((b) => b.status === 'VACANT').map((b) => ({ ...b, roomNumber: r.number }))
  ) ?? [];

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; data: { id: string } }>('/tenants', {
        name: form.name.trim(),
        phone: `+91${form.phone}`,
        propertyId: form.propertyId,
        bedId: form.bedId,
        rate: Number(form.rate),
        checkIn: form.checkIn,
        securityExpected: Number(form.securityExpected) || 0,
        securityReceived: Number(form.securityReceived) || 0,
        discount: Number(form.discount) || 0,
        remarks: form.remarks || undefined,
      });
      return data.data;
    },
    onSuccess: (newTenant) => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant onboarded ✓');
      router.push(newTenant?.id ? `/tenants/${newTenant.id}` : '/tenants');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to onboard tenant.');
    },
  });

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
    else submit();
  };

  const STEP_LABELS = ['Tenant Info', 'Bed Selection', 'Financial'];

  return (
    <div>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : router.back()} className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-sm">Onboard Tenant</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 3 — {STEP_LABELS[step - 1]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-1 bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="px-4 py-6 space-y-5">

        {/* Step 1: Tenant info */}
        {step === 1 && (
          <>
            <Field label="Full Name" error={errors.name}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rahul Sharma" className="field-input" />
            </Field>
            <Field label="Phone Number" error={errors.phone}>
              <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2.5 text-sm font-semibold bg-muted">+91</span>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-background"
                />
              </div>
            </Field>
          </>
        )}

        {/* Step 2: Bed selection */}
        {step === 2 && (
          <>
            <Field label="Property" error={errors.propertyId}>
              <select value={form.propertyId} onChange={(e) => { set('propertyId', e.target.value); set('bedId', ''); }} className="field-input">
                <option value="">Select property…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            {form.propertyId && (
              <Field label="Vacant Bed" error={errors.bedId}>
                <select value={form.bedId} onChange={(e) => set('bedId', e.target.value)} className="field-input">
                  <option value="">Select bed…</option>
                  {vacantBeds.map((b) => (
                    <option key={b.id} value={b.id}>Room {b.roomNumber} · Bed {b.label}</option>
                  ))}
                </select>
                {vacantBeds.length === 0 && <p className="text-xs text-yellow-600 mt-1">No vacant beds in this property.</p>}
              </Field>
            )}
          </>
        )}

        {/* Step 3: Financial */}
        {step === 3 && (
          <>
            <Field label="Monthly Rent (₹)" error={errors.rate}>
              <input value={form.rate} onChange={(e) => set('rate', e.target.value)} type="number" placeholder="8000" className="field-input" />
            </Field>
            <Field label="Check-in Date" error={errors.checkIn}>
              <input value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} type="date" className="field-input" />
            </Field>
            <Field label="Security Deposit Expected (₹)">
              <input value={form.securityExpected} onChange={(e) => set('securityExpected', e.target.value)} type="number" placeholder="16000" className="field-input" />
            </Field>
            <Field label="Security Deposit Received (₹)">
              <input value={form.securityReceived} onChange={(e) => set('securityReceived', e.target.value)} type="number" placeholder="16000" className="field-input" />
            </Field>
            <Field label="Discount (%)">
              <input value={form.discount} onChange={(e) => set('discount', e.target.value)} type="number" min="0" max="100" placeholder="0" className="field-input" />
            </Field>
            <Field label="Remarks (optional)">
              <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} className="field-input resize-none" />
            </Field>
          </>
        )}

        <button
          onClick={handleNext}
          disabled={isPending}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-4"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {step < 3 ? (
            <><span>Next</span><ChevronRight className="w-4 h-4" /></>
          ) : 'Onboard Tenant'}
        </button>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: hsl(var(--background));
        }
        .field-input:focus {
          box-shadow: 0 0 0 2px hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
