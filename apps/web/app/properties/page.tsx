'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import { cn } from '@/lib/utils';

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
  rooms: RoomItem[];
  _count: { tenants: number };
}

export default function PropertiesPage() {
  const { data, isLoading, error } = useQuery<PropertyItem[]>({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: PropertyItem[] }>('/properties');
      return data.data ?? [];
    },
  });

  const properties = data ?? [];

  return (
    <div>
      <Header title="Properties" />
      <div className="px-4 py-4 space-y-6">
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
                  <p className="text-xs text-muted-foreground">{property.code} · {property.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{occupancyPct}% full</p>
                  <p className="text-xs text-muted-foreground">{occupiedBeds}/{totalBeds} beds</p>
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
