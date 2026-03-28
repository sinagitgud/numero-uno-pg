'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, X, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BedItem {
  id: string;
  label: string;
  status: 'VACANT' | 'OCCUPIED';
  tenant?: { user: { name: string } } | null;
}

interface RoomItem {
  id: string;
  number: string;
  capacity: number;
  isAc: boolean;
  beds: BedItem[];
}

interface PropertyItem {
  id: string;
  name: string;
  code: string;
  type: string;
  ownership: string;
  upiQrUrl: string | null;
  rooms: RoomItem[];
  _count: { tenants: number };
}

const PROPERTY_TYPES = ['PG', 'OFFICE', 'CO_LIVING'];
const OWNERSHIP_TYPES = ['OWNED', 'RENTED'];

export default function PropertiesPage() {
  const qc = useQueryClient();
  const qrInputRef = useRef<HTMLInputElement>(null);
  const editQrInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editQrPropertyId, setEditQrPropertyId] = useState<string | null>(null);

  // Add property form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('PG');
  const [ownership, setOwnership] = useState('OWNED');
  const [address, setAddress] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const { data, isLoading, error } = useQuery<PropertyItem[]>({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: PropertyItem[] }>('/properties');
      return data.data ?? [];
    },
  });

  const properties = data ?? [];

  const handleQrFileChange = (file: File | null) => {
    setQrFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setQrPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setQrPreview(null);
    }
  };

  const uploadQrImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ success: boolean; data: { url: string } }>('/upload/qr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.url;
  };

  const handleAddProperty = async () => {
    if (!name.trim() || !code.trim() || !address.trim()) {
      toast.error('Name, code, and address are required');
      return;
    }
    if (!qrFile) {
      toast.error('UPI QR code image is required');
      return;
    }
    setSaving(true);
    try {
      const upiQrUrl = await uploadQrImage(qrFile);
      await api.post('/properties', { name: name.trim(), code: code.trim().toUpperCase(), type, ownership, address: address.trim(), upiQrUrl });
      toast.success('Property added ✓');
      setShowForm(false);
      setName(''); setCode(''); setAddress('');
      setType('PG'); setOwnership('OWNED');
      setQrFile(null); setQrPreview(null);
      qc.invalidateQueries({ queryKey: ['properties'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to add property');
    } finally {
      setSaving(false);
    }
  };

  const handleEditQr = async (file: File, propertyId: string) => {
    setUploadingQr(true);
    try {
      const upiQrUrl = await uploadQrImage(file);
      await api.patch(`/properties/${propertyId}`, { upiQrUrl });
      toast.success('QR code updated ✓');
      qc.invalidateQueries({ queryKey: ['properties'] });
    } catch {
      toast.error('Failed to update QR code');
    } finally {
      setUploadingQr(false);
      setEditQrPropertyId(null);
    }
  };

  return (
    <div>
      <Header title="Properties" />
      <div className="px-4 py-4 space-y-6">

        {/* Add Property button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add property
        </button>

        {/* Add Property form */}
        {showForm && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">New property</p>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Property name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background"
                  placeholder="e.g. The Haven" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Short code *</label>
                  <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background uppercase"
                    placeholder="e.g. TH01" maxLength={10} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background">
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ownership</label>
                <select value={ownership} onChange={e => setOwnership(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background">
                  {OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Address *</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-background"
                  placeholder="Full address" />
              </div>

              {/* UPI QR Code upload */}
              <div>
                <label className="text-xs text-muted-foreground">UPI QR Code *</label>
                <input ref={qrInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleQrFileChange(e.target.files?.[0] ?? null)} />
                {qrPreview ? (
                  <div className="mt-1 relative w-32 h-32">
                    <img src={qrPreview} alt="QR preview" className="w-32 h-32 object-contain rounded-lg border" />
                    <button onClick={() => { setQrFile(null); setQrPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => qrInputRef.current?.click()}
                    className="mt-1 w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload QR image
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleAddProperty}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Add property'}
            </button>
          </div>
        )}

        {isLoading ? (
          [1,2].map(i => <SkeletonCard key={i} />)
        ) : error ? (
          <p className="text-sm text-destructive text-center py-8">Failed to load. Pull to refresh.</p>
        ) : properties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No properties added yet.</p>
        ) : properties.map((property) => {
          const totalBeds = property.rooms.flatMap(r => r.beds).length;
          const occupiedBeds = property.rooms.flatMap(r => r.beds).filter(b => b.status === 'OCCUPIED').length;
          const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

          return (
            <section key={property.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-sm">{property.name}</h2>
                  <p className="text-xs text-muted-foreground">{property.code} · {property.type.replace('_',' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit QR button */}
                  <input
                    ref={editQrPropertyId === property.id ? editQrInputRef : undefined}
                    type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleEditQr(file, property.id);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => {
                      setEditQrPropertyId(property.id);
                      setTimeout(() => editQrInputRef.current?.click(), 50);
                    }}
                    disabled={uploadingQr}
                    title={property.upiQrUrl ? 'Update QR code' : 'Upload QR code'}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors',
                      property.upiQrUrl
                        ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        : 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100'
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {uploadingQr && editQrPropertyId === property.id ? 'Uploading…' : property.upiQrUrl ? 'QR ✓' : 'Add QR'}
                  </button>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{occupancyPct}% full</p>
                    <p className="text-xs text-muted-foreground">{occupiedBeds}/{totalBeds} beds</p>
                  </div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
                <div
                  className={cn('h-2 rounded-full transition-all', occupancyPct > 80 ? 'bg-green-500' : occupancyPct > 50 ? 'bg-yellow-500' : 'bg-red-400')}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>

              {/* Rooms */}
              <div className="space-y-3">
                {property.rooms.map((room) => (
                  <div key={room.id} className="rounded-xl border overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/50 flex items-center justify-between">
                      <p className="text-xs font-semibold">Room {room.number}{room.isAc ? ' · AC' : ''}</p>
                      <p className="text-xs text-muted-foreground">{room.beds.filter(b => b.status === 'OCCUPIED').length}/{room.capacity} occupied</p>
                    </div>
                    <div className="grid grid-cols-2">
                      {room.beds.map((bed, i) => (
                        <div
                          key={bed.id}
                          className={cn(
                            'px-3 py-2 border-b border-r last:border-r-0 odd:border-r',
                            bed.status === 'VACANT' ? 'bg-green-50' : 'bg-background',
                            i >= room.beds.length - (room.beds.length % 2 === 0 ? 2 : 1) ? 'border-b-0' : ''
                          )}
                        >
                          <p className="text-xs font-medium">Bed {bed.label}</p>
                          <p className={cn('text-[10px] mt-0.5', bed.status === 'VACANT' ? 'text-green-600' : 'text-muted-foreground')}>
                            {bed.status === 'VACANT' ? 'Vacant' : bed.tenant?.user.name ?? 'Occupied'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}