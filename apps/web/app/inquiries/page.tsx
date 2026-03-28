'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, X, Loader2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InquiryItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  bedPreference?: string | null;
  budget?: number | null;
  inquiryDate: string;
  status: 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'CONVERTED' | 'DROPPED';
  notes?: string | null;
  property?: { name: string; code: string } | null;
  propertyId?: string | null;
}

interface Property {
  id: string; name: string; code: string;
  rooms: Array<{ id: string; number: string; beds: Array<{ id: string; label: string; status: string }> }>;
}

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  VISIT_SCHEDULED: 'bg-purple-100 text-purple-700',
  CONVERTED: 'bg-green-100 text-green-700',
  DROPPED: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CONVERTED', 'DROPPED'];

interface AddForm {
  name: string; phone: string; email: string;
  bedPreference: string; budget: string; notes: string;
}

interface ConvertForm {
  propertyId: string; bedId: string;
  rate: string; checkIn: string;
  securityExpected: string; securityReceived: string;
}

const INIT: AddForm = { name: '', phone: '', email: '', bedPreference: '', budget: '', notes: '' };
const INIT_CONVERT: ConvertForm = {
  propertyId: '', bedId: '',
  rate: '', checkIn: new Date().toISOString().split('T')[0],
  securityExpected: '', securityReceived: '',
};

export default function InquiriesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(INIT);
  const [errors, setErrors] = useState<Partial<AddForm>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm>(INIT_CONVERT);
  const [convertErrors, setConvertErrors] = useState<Partial<ConvertForm>>({});

  const { data, isLoading } = useQuery<{ data: InquiryItem[] }>({
    queryKey: ['inquiries', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/inquiries', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
  });

  const { data: propertiesData } = useQuery<{ data: Property[] }>({
    queryKey: ['properties-for-convert'],
    queryFn: () => api.get('/properties', { params: { includeRooms: true, limit: 50 } }).then(r => r.data),
    enabled: !!convertingId,
  });

  const properties = propertiesData?.data ?? [];
  const inquiries = data?.data ?? [];

  const { mutate: addInquiry, isPending } = useMutation({
    mutationFn: async () => {
      const errs: Partial<AddForm> = {};
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit phone';
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Validation'); }
      setErrors({});
      await api.post('/inquiries', {
        name: form.name.trim(),
        phone: `+91${form.phone}`,
        email: form.email || undefined,
        bedPreference: form.bedPreference || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success('Inquiry added ✓');
      setForm(INIT);
      setShowAdd(false);
    },
    onError: (err: any) => {
      if (err.message !== 'Validation') toast.error('Failed to add inquiry.');
    },
  });

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/inquiries/${id}`, { status });
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success(`Moved to ${status}`);
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openConvert = (inq: InquiryItem) => {
    setConvertForm({ ...INIT_CONVERT, propertyId: inq.propertyId ?? '' });
    setConvertErrors({});
    setConvertingId(inq.id);
  };

  const { mutate: submitConvert, isPending: converting } = useMutation({
    mutationFn: async (inquiryId: string) => {
      const errs: Partial<ConvertForm> = {};
      if (!convertForm.propertyId) errs.propertyId = 'Select a property';
      if (!convertForm.bedId) errs.bedId = 'Select a bed';
      if (!convertForm.rate || Number(convertForm.rate) <= 0) errs.rate = 'Enter rent amount';
      if (!convertForm.checkIn) errs.checkIn = 'Select check-in date';
      if (Object.keys(errs).length) { setConvertErrors(errs); throw new Error('Validation'); }
      setConvertErrors({});

      await api.post(`/inquiries/${inquiryId}/convert`, {
        propertyId: convertForm.propertyId,
        bedId: convertForm.bedId,
        rate: Number(convertForm.rate),
        checkIn: convertForm.checkIn,
        securityExpected: convertForm.securityExpected ? Number(convertForm.securityExpected) : undefined,
        securityReceived: convertForm.securityReceived ? Number(convertForm.securityReceived) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Converted to tenant ✓');
      setConvertingId(null);
      setConvertForm(INIT_CONVERT);
    },
    onError: (err: any) => {
      if (err.message !== 'Validation') {
        toast.error(err.response?.data?.error || 'Conversion failed.');
      }
    },
  });

  const selectedProperty = properties.find((p) => p.id === convertForm.propertyId);
  const vacantBeds = selectedProperty?.rooms.flatMap((r) =>
    r.beds.filter((b) => b.status === 'VACANT').map((b) => ({ ...b, roomNumber: r.number }))
  ) ?? [];

  return (
    <div>
      <Header title="Inquiries" />
      <div className="px-4 py-4 space-y-4">

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : inquiries.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No inquiries yet. Tap + to log one.
            </p>
          ) : inquiries.map((inq) => (
            <div key={inq.id} className="border-b last:border-0">
              <div className="px-4 py-3 flex items-start justify-between">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-sm font-medium">{inq.name}</p>
                  <p className="text-xs text-muted-foreground">{inq.phone} · {formatDate(inq.inquiryDate)}</p>
                  {inq.bedPreference && <p className="text-xs text-muted-foreground">Bed: {inq.bedPreference}</p>}
                  {inq.budget && <p className="text-xs text-muted-foreground">Budget: {formatCurrency(inq.budget)}</p>}
                  {inq.notes && <p className="text-xs text-muted-foreground line-clamp-1">{inq.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inq.status]}`}>
                    {inq.status.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1 items-center">
                    <a href={`tel:${inq.phone}`} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    {inq.status !== 'CONVERTED' && inq.status !== 'DROPPED' && (
                      <>
                        <select
                          value={inq.status}
                          onChange={(e) => updateStatus(inq.id, e.target.value)}
                          disabled={updatingId === inq.id}
                          className="text-sm border rounded px-1 py-0.5 bg-background outline-none"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                        <button
                          onClick={() => convertingId === inq.id ? setConvertingId(null) : openConvert(inq)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          aria-label="Convert to tenant"
                          title="Convert to Tenant"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline convert form */}
              {convertingId === inq.id && (
                <div className="mx-4 mb-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">Convert: {inq.name}</p>
                    <button onClick={() => setConvertingId(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Property *</label>
                    <select
                      value={convertForm.propertyId}
                      onChange={(e) => setConvertForm((f) => ({ ...f, propertyId: e.target.value, bedId: '' }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    >
                      <option value="">Select property…</option>
                      {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {convertErrors.propertyId && <p className="text-xs text-destructive mt-0.5">{convertErrors.propertyId}</p>}
                  </div>

                  {convertForm.propertyId && (
                    <div>
                      <label className="text-xs font-medium block mb-1">Vacant Bed *</label>
                      <select
                        value={convertForm.bedId}
                        onChange={(e) => setConvertForm((f) => ({ ...f, bedId: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      >
                        <option value="">Select bed…</option>
                        {vacantBeds.map((b) => (
                          <option key={b.id} value={b.id}>Room {b.roomNumber} · {b.label}</option>
                        ))}
                      </select>
                      {convertErrors.bedId && <p className="text-xs text-destructive mt-0.5">{convertErrors.bedId}</p>}
                      {vacantBeds.length === 0 && <p className="text-xs text-yellow-600 mt-0.5">No vacant beds in this property.</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Monthly Rent (₹) *</label>
                      <input
                        type="number"
                        value={convertForm.rate}
                        onChange={(e) => setConvertForm((f) => ({ ...f, rate: e.target.value }))}
                        placeholder="8000"
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                      {convertErrors.rate && <p className="text-xs text-destructive mt-0.5">{convertErrors.rate}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Check-in Date *</label>
                      <input
                        type="date"
                        value={convertForm.checkIn}
                        onChange={(e) => setConvertForm((f) => ({ ...f, checkIn: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Security Expected (₹)</label>
                      <input
                        type="number"
                        value={convertForm.securityExpected}
                        onChange={(e) => setConvertForm((f) => ({ ...f, securityExpected: e.target.value }))}
                        placeholder={convertForm.rate || '—'}
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Security Received (₹)</label>
                      <input
                        type="number"
                        value={convertForm.securityReceived}
                        onChange={(e) => setConvertForm((f) => ({ ...f, securityReceived: e.target.value }))}
                        placeholder="0"
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => submitConvert(inq.id)}
                    disabled={converting}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {converting ? 'Converting…' : 'Confirm Conversion'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Log Inquiry</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Name *</label>
              <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: undefined })); }} placeholder="Amit Kumar" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Phone *</label>
              <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2.5 text-sm font-semibold bg-muted">+91</span>
                <input value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors((er) => ({ ...er, phone: undefined })); }} inputMode="numeric" placeholder="9876543210" className="flex-1 px-3 py-2.5 text-sm outline-none bg-background" />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Bed preference</label>
              <input value={form.bedPreference} onChange={(e) => setForm((f) => ({ ...f, bedPreference: e.target.value }))} placeholder="AC double, Koramangala" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Budget (₹/mo)</label>
              <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="8000" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background resize-none" />
            </div>
            <button onClick={() => addInquiry()} disabled={isPending} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Inquiry
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90"
          aria-label="Add inquiry"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}