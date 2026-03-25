'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'default';
  loading?: boolean;
}

export function StatCard({ label, value, sub, accent = 'default', loading }: StatCardProps) {
  const accentColors = {
    green: 'text-green-600',
    red: 'text-red-500',
    yellow: 'text-yellow-600',
    default: 'text-foreground',
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-7 bg-muted rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold', accentColors[accent])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
