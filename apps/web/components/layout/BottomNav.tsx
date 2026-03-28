'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, CreditCard, Ticket, Building2,
  Receipt, UserCheck, CalendarOff, UserPlus, UserCog,
  TrendingUp, Wrench, Target, ScanLine, Home, MoreHorizontal, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import type { UserRole } from '@numero-uno-pg/shared';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',   icon: <LayoutDashboard className="w-5 h-5" />, roles: ['OWNER'] },
  { href: '/tenants',      label: 'Tenants',     icon: <Users className="w-5 h-5" />,           roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/rent',         label: 'Rent',        icon: <CreditCard className="w-5 h-5" />,      roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/tickets',      label: 'Tickets',     icon: <Ticket className="w-5 h-5" />,          roles: ['OWNER', 'SALES_MANAGER', 'OPS_MANAGER'] },
  { href: '/properties',   label: 'Properties',  icon: <Building2 className="w-5 h-5" />,       roles: ['OWNER', 'SALES_MANAGER', 'OPS_MANAGER'] },
  { href: '/expenses',     label: 'Expenses',    icon: <Receipt className="w-5 h-5" />,         roles: ['OWNER', 'OPS_MANAGER'] },
  { href: '/staff',        label: 'Staff',       icon: <UserCog className="w-5 h-5" />,         roles: ['OWNER'] },
  { href: '/guests',       label: 'Guests',      icon: <UserCheck className="w-5 h-5" />,       roles: ['OWNER', 'OPS_MANAGER'] },
  { href: '/leaves',       label: 'Leaves',      icon: <CalendarOff className="w-5 h-5" />,     roles: ['OWNER'] },
  { href: '/inquiries',    label: 'Inquiries',   icon: <UserPlus className="w-5 h-5" />,        roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/investments',  label: 'Investments', icon: <TrendingUp className="w-5 h-5" />,      roles: ['OWNER'] },
  { href: '/capex',        label: 'Capex',       icon: <Wrench className="w-5 h-5" />,          roles: ['OWNER'] },
  { href: '/goals',        label: 'Goals',       icon: <Target className="w-5 h-5" />,          roles: ['OWNER'] },
  { href: '/entry-exit',   label: 'Entry/Exit',  icon: <ScanLine className="w-5 h-5" />,        roles: ['OWNER', 'OPS_MANAGER'] },
  // Tenant tabs
  { href: '/tenant',         label: 'Home',    icon: <Home className="w-5 h-5" />,             roles: ['TENANT'] },
  { href: '/tenant/rent',    label: 'Rent',    icon: <CreditCard className="w-5 h-5" />,       roles: ['TENANT'] },
  { href: '/tenant/support', label: 'Support', icon: <Ticket className="w-5 h-5" />,           roles: ['TENANT'] },
  { href: '/tenant/info',    label: 'Info',    icon: <Building2 className="w-5 h-5" />,        roles: ['TENANT'] },
  { href: '/tenant/guests',  label: 'Guests',  icon: <UserCheck className="w-5 h-5" />,        roles: ['TENANT'] },
  { href: '/tenant/leave',   label: 'Leave',   icon: <CalendarOff className="w-5 h-5" />,      roles: ['TENANT'] },
];

const PRIMARY_TABS: Record<UserRole, string[]> = {
  OWNER:         ['/dashboard', '/tenants', '/rent', '/inquiries'],
  SALES_MANAGER: ['/tenants', '/rent', '/tickets', '/inquiries'],
  OPS_MANAGER:   ['/tickets', '/properties', '/expenses', '/guests'],
  TENANT:        ['/tenant', '/tenant/rent', '/tenant/support', '/tenant/info'],
};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const [showMore, setShowMore] = useState(false);

  const { data: pendingLeavesData } = useQuery<{ data: { total?: number; data?: unknown[] } }>({
    queryKey: ['more-badge-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/leaves', { params: { status: 'PENDING', limit: 1 } });
      return data;
    },
    enabled: role === 'OWNER' || role === 'SALES_MANAGER',
    refetchInterval: 60_000,
  });
  const pendingLeavesTotal = (pendingLeavesData?.data as any)?.data?.length ?? 0;

  if (!role) return null;

  const primaryHrefs = PRIMARY_TABS[role] ?? [];
  const allRoleItems = NAV_ITEMS.filter((i) => i.roles.includes(role));
  const primaryItems = allRoleItems.filter((i) => primaryHrefs.includes(i.href));
  const moreItems = allRoleItems.filter((i) => !primaryHrefs.includes(i.href));
  const hasMore = moreItems.length > 0;
  const moreActive = showMore || moreItems.some((i) => pathname.startsWith(i.href));

  return (
    <>
      {/* More sheet overlay */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 max-w-md mx-auto bg-background border-t rounded-t-2xl shadow-xl px-4 pt-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">More</p>
              <button onClick={() => setShowMore(false)} className="p-1 rounded-md hover:bg-muted" aria-label="Close menu">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setShowMore(false); }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex justify-around items-stretch h-16 safe-area-pb">
        {primaryItems.map((item) => {
          const active = item.href === '/tenant' ? pathname === '/tenant' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-0.5 text-xs transition-colors relative',
              moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="relative">
              <MoreHorizontal className="w-5 h-5" />
              {pendingLeavesTotal > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </span>
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  );
}