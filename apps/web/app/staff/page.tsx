'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatCurrency } from '@/lib/utils';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  salary: number;
  status: 'ACTIVE' | 'INACTIVE';
  property?: { name: string } | null;
}

interface SalaryRecord {
  id: string;
  staffId: string;
  month: number;
  year: number;
  daysWorked: number;
  payableSalary: number;
  advance: number;
  balance: number;
  status: 'PAID' | 'PENDING' | 'PARTIAL';
  staff?: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'text-green-600',
  PENDING: 'text-orange-500',
  PARTIAL: 'text-yellow-600',
};

export default function StaffPage() {
  const { data: staffData, isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: StaffMember[] }>('/staff');
      return data.data ?? [];
    },
  });

  const { data: salaryData, isLoading: salaryLoading } = useQuery<SalaryRecord[]>({
    queryKey: ['salary'],
    queryFn: async () => {
      const now = new Date();
      const { data } = await api.get<{ success: boolean; data: SalaryRecord[] }>('/staff/salary', {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      });
      return data.data ?? [];
    },
  });

  const staff = staffData ?? [];
  const salaries = salaryData ?? [];

  return (
    <div>
      <Header title="Staff" />
      <div className="px-4 py-4 space-y-6">

        {/* Staff list */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team</h2>
          <div className="rounded-xl border overflow-hidden">
            {staffLoading ? (
              [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
            ) : staff.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No staff added yet.</p>
            ) : staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role} {s.property ? `· ${s.property.name}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(s.salary)}/mo</p>
                  <span className={`text-xs ${s.status === 'ACTIVE' ? 'text-green-600' : 'text-muted-foreground'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* This month's salaries */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Month's Salary</h2>
          <div className="rounded-xl border overflow-hidden">
            {salaryLoading ? (
              [1,2].map(i => <SkeletonRow key={i} cols={3} />)
            ) : salaries.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No salary records this month.</p>
            ) : salaries.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.staff?.name}</p>
                  <p className="text-xs text-muted-foreground">{s.daysWorked} days · Advance: {formatCurrency(s.advance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(s.payableSalary)}</p>
                  <span className={`text-xs font-medium ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
