'use client';

import { useQuery } from '@tanstack/react-query';
import { Wifi, BookOpen, UtensilsCrossed, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';

interface Property {
  name: string;
  address: string;
  wifiDetails: string | null;
  houseRules: string | null;
  mealSchedule: string | null;
}

interface TenantProfile {
  tenant: {
    bed: {
      label: string;
      room: {
        number: string;
        isAc: boolean;
        capacity: number;
        property: Property;
      };
    };
  } | null;
}

interface FoodMenuItem {
  dayOfWeek: string;
  mealType: string;
  items: string[];
}

const DAY_ORDER = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAY_LABELS: Record<string, string> = { MON:'Monday', TUE:'Tuesday', WED:'Wednesday', THU:'Thursday', FRI:'Friday', SAT:'Saturday', SUN:'Sunday' };
const MEAL_ORDER = ['BREAKFAST','LUNCH','DINNER'];
const MEAL_LABELS: Record<string, string> = { BREAKFAST:'Breakfast', LUNCH:'Lunch', DINNER:'Dinner' };

export default function TenantInfoPage() {
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => api.get<{ success: boolean; data: TenantProfile }>('/auth/me').then(r => r.data.data),
  });

  const property = meData?.tenant?.bed?.room?.property;

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['tenant-menu', property?.name],
    queryFn: async () => {
      // Get propertyId from the tenancy info
      const meRes = await api.get<{ success: boolean; data: any }>('/auth/me');
      const propertyId = meRes.data.data?.tenant?.propertyId;
      if (!propertyId) return [];
      const menuRes = await api.get<{ success: boolean; data: FoodMenuItem[] }>(`/menu/${propertyId}`);
      return menuRes.data.data ?? [];
    },
    enabled: !!meData?.tenant,
  });

  if (meLoading) return (
    <div className="pb-20">
      <Header title="Property Info" />
      <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  if (!property) return (
    <div className="pb-20">
      <Header title="Property Info" />
      <div className="p-4">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Property details not available yet. Contact your property manager.
        </div>
      </div>
    </div>
  );

  // Group menu by day
  const menuByDay: Record<string, Record<string, string[]>> = {};
  (menuData ?? []).forEach((item: FoodMenuItem) => {
    if (!menuByDay[item.dayOfWeek]) menuByDay[item.dayOfWeek] = {};
    menuByDay[item.dayOfWeek][item.mealType] = item.items;
  });
  const hasStructuredMenu = Object.keys(menuByDay).length > 0;

  return (
    <div className="pb-20">
      <Header title="Property Info" />

      <div className="p-4 space-y-4">
        {/* Property overview */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="w-4 h-4 text-primary" />
            {property.name}
          </div>
          <p className="text-sm text-muted-foreground">{property.address}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Room</p>
              <p className="font-medium">Room {meData?.tenant?.bed.room.number}{meData?.tenant?.bed.room.isAc ? ' (AC)' : ''}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Bed</p>
              <p className="font-medium">{meData?.tenant?.bed.label}</p>
            </div>
          </div>
        </div>

        {/* WiFi */}
        {property.wifiDetails && (
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Wifi className="w-4 h-4 text-primary" />
              WiFi Details
            </div>
            <p className="text-sm whitespace-pre-wrap">{property.wifiDetails}</p>
          </div>
        )}

        {/* House Rules */}
        {property.houseRules && (
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <BookOpen className="w-4 h-4 text-primary" />
              House Rules
            </div>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{property.houseRules}</p>
          </div>
        )}

        {/* Food Menu */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            Food Menu
          </div>

          {menuLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : hasStructuredMenu ? (
            <div className="space-y-4">
              {DAY_ORDER.filter(d => menuByDay[d]).map(day => (
                <div key={day}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{DAY_LABELS[day]}</p>
                  <div className="space-y-1.5">
                    {MEAL_ORDER.filter(m => menuByDay[day]?.[m]).map(meal => (
                      <div key={meal} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground w-20 shrink-0">{MEAL_LABELS[meal]}</span>
                        <span>{(menuByDay[day][meal] ?? []).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : property.mealSchedule ? (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{property.mealSchedule}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No menu available. Ask your property manager.</p>
          )}
        </div>
      </div>
    </div>
  );
}
