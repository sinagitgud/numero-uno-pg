'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, Ticket, Building2,
  Receipt, UserCheck, CalendarOff, UserPlus, MoreHorizontal, UserCog,
  TrendingUp, Wrench, Target, ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@numero-uno-pg/shared';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard className="w-5 h-5" />, roles: ['OWNER'] },
  { href: '/tenants',    label: 'Tenants',    icon: <Users className="w-5 h-5" />,           roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/rent',       label: 'Rent',       icon: <CreditCard className="w-5 h-5" />,      roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/tickets',    label: 'Tickets',    icon: <Ticket className="w-5 h-5" />,           roles: ['OWNER', 'SALES_MANAGER', 'OPS_MANAGER'] },
  { href: '/properties', label: 'Properties', icon: <Building2 className="w-5 h-5" />,       roles: ['OWNER', 'SALES_MANAGER', 'OPS_MANAGER'] },
  { href: '/expenses',   label: 'Expenses',   icon: <Receipt className="w-5 h-5" />,         roles: ['OWNER', 'OPS_MANAGER'] },
  { href: '/staff',      label: 'Staff',      icon: <UserCog className="w-5 h-5" />,         roles: ['OWNER'] },
  { href: '/guests',     label: 'Guests',     icon: <UserCheck className="w-5 h-5" />,       roles: ['OWNER', 'OPS_MANAGER'] },
  { href: '/leaves',     label: 'Leaves',     icon: <CalendarOff className="w-5 h-5" />,     roles: ['OWNER'] },
  { href: '/inquiries',   label: 'Inquiries',    icon: <UserPlus className="w-5 h-5" />,   roles: ['OWNER', 'SALES_MANAGER'] },
  { href: '/investments', label: 'Investments',  icon: <TrendingUp className="w-5 h-5" />, roles: ['OWNER'] },
  { href: '/capex',       label: 'Capex',        icon: <Wrench className="w-5 h-5" />,     roles: ['OWNER'] },
  { href: '/goals',       label: 'Goals',        icon: <Target className="w-5 h-5" />,     roles: ['OWNER'] },
  { href: '/entry-exit',  label: 'Entry/Exit',   icon: <ScanLine className="w-5 h-5" />,   roles: ['OWNER', 'OPS_MANAGER'] },
];

// Primary tabs per role (max 4 + More)
const PRIMARY_TABS: Record<UserRole, string[]> = {
  OWNER:         ['/dashboard', '/tenants', '/rent', '/tickets'],
  SALES_MANAGER: ['/tenants', '/rent', '/tickets', '/inquiries'],
  OPS_MANAGER:   ['/tickets', '/properties', '/expenses', '/guests'],
  TENANT:        [],
};

export function BottomNav() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  if (!role || role === 'TENANT') return null;

  const primaryHrefs = PRIMARY_TABS[role] ?? [];
  const primaryItems = NAV_ITEMS.filter((i) => primaryHrefs.includes(i.href) && i.roles.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex justify-around items-stretch h-16 safe-area-pb">
      {primaryItems.map((item) => {
        const active = pathname.startsWith(item.href);
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
    </nav>
  );
}
