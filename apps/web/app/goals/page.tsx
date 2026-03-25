'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Target, Trophy, Settings, Loader2, Plus, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/shared/PageLoader';
import { formatCurrency, monthLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

interface IncentiveResult {
  month: number;
  year: number;
  totalExpected: number;
  totalCollected: number;
  collectionPct: number;
  appliedTier: { minPercent: number; maxPercent: number; rate: number } | null;
  incentive: number;
  baseSalary: number;
  totalPayout: number;
}

interface GoalConfig {
  id: string;
  month: number;
  year: number;
  propertyTargets: Record<string, number>;
  baseSalary: number;
  incentiveTiers: Array<{ minPercent: number; maxPercent: number; rate: number }>;
}

interface IncentiveTier {
  minPercent: number;
  maxPercent: number;
  rate: number;
}

export default function GoalsPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showConfig, setShowConfig] = useState(false);

  // Config form state
  const [baseSalary, setBaseSalary] = useState('');
  const [targets, setTargets] = useState<Array<{ label: string; amount: string }>>([{ label: '', amount: '' }]);
  const [tiers, setTiers] = useState<IncentiveTier[]>([
    { minPercent: 0, maxPercent: 80, rate: 0.01 },
    { minPercent: 80, maxPercent: 95, rate: 0.015 },
    { minPercent: 95, maxPercent: 110, rate: 0.02 },
  ]);

  const navigate = (dir: -1 | 1) => {
    let m = month + dir; let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const { data: config, isLoading: configLoading } = useQuery<GoalConfig | null>({
    queryKey: ['goals', month, year],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: GoalConfig | null }>('/goals', { params: { month, year } });
      return data.data;
    },
  });

  const { data: incentive, isLoading: incentiveLoading } = useQuery<IncentiveResult>({
    queryKey: ['goals-incentive', month, year],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: IncentiveResult }>('/goals/incentive', { params: { month, year } });
      return data.data;
    },
    enabled: !!config,
    retry: false,
  });

  const { mutate: saveConfig, isPending } = useMutation({
    mutationFn: async () => {
      const propertyTargets: Record<string, number> = {};
      for (const t of targets) {
        if (t.label.trim() && Number(t.amount) > 0) {
          propertyTargets[t.label.trim()] = Number(t.amount);
        }
      }
      if (Object.keys(propertyTargets).length === 0) throw new Error('Add at least one property target');
      if (!baseSalary || Number(baseSalary) <= 0) throw new Error('Base salary required');

      await api.post('/goals', {
        month,
        year,
        propertyTargets,
        baseSalary: Number(baseSalary),
        incentiveTiers: tiers,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', month, year] });
      qc.invalidateQueries({ queryKey: ['goals-incentive', month, year] });
      toast.success('Goals saved');
      setShowConfig(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save goals'),
  });

  // Pre-fill form when config loads
  const openConfig = () => {
    if (config) {
      setBaseSalary(String(config.baseSalary));
      setTargets(
        Object.entries(config.propertyTargets).map(([label, amount]) => ({ label, amount: String(amount) }))
      );
      setTiers(config.incentiveTiers);
    }
    setShowConfig(true);
  };

  const isLoading = configLoading;

  return (
    <div>
      <Header title="Goals & Targets" />
      <div className="px-4 py-4 space-y-4">

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium w-36 text-center">{monthLabel(month, year)}</span>
            <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button
            onClick={openConfig}
            className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5"
          >
            <Settings className="w-3.5 h-3.5" />
            {config ? 'Edit Goals' : 'Set Goals'}
          </button>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : !config ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No goals set for {monthLabel(month, year)}.</p>
            <button
              onClick={openConfig}
              className="mt-3 text-sm text-primary font-medium"
            >
              Set targets →
            </button>
          </div>
        ) : (
          <>
            {/* Incentive calculator */}
            {incentiveLoading ? (
              <div className="rounded-xl border p-4 animate-pulse h-32 bg-muted" />
            ) : incentive ? (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm font-semibold">Collection vs Target</p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatCurrency(incentive.totalCollected)} collected</span>
                    <span>{incentive.collectionPct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        incentive.collectionPct >= 95 ? 'bg-green-500' :
                        incentive.collectionPct >= 80 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(incentive.collectionPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target: {formatCurrency(incentive.totalExpected)}</p>
                </div>

                {/* Payout breakdown */}
                <div className="border-t pt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Base Salary</p>
                    <p className="text-sm font-medium">{formatCurrency(Number(incentive.baseSalary))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Incentive</p>
                    <p className="text-sm font-medium text-green-600">+{formatCurrency(incentive.incentive)}</p>
                    {incentive.appliedTier && (
                      <p className="text-[10px] text-muted-foreground">{(incentive.appliedTier.rate * 100).toFixed(1)}% rate</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Payout</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(incentive.totalPayout)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Property targets */}
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b">
                <p className="text-xs font-medium text-muted-foreground">Property Targets</p>
              </div>
              {Object.entries(config.propertyTargets).map(([label, amount]) => (
                <div key={label} className="flex justify-between px-4 py-3 border-b last:border-0">
                  <p className="text-sm">{label}</p>
                  <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 bg-muted/20">
                <p className="text-sm font-semibold">Total Target</p>
                <p className="text-sm font-bold">
                  {formatCurrency(Object.values(config.propertyTargets).reduce((a, b) => a + b, 0))}
                </p>
              </div>
            </div>

            {/* Incentive tiers */}
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b">
                <p className="text-xs font-medium text-muted-foreground">Incentive Tiers</p>
              </div>
              {config.incentiveTiers.map((tier, i) => (
                <div key={i} className="flex justify-between px-4 py-3 border-b last:border-0">
                  <p className="text-sm text-muted-foreground">
                    {tier.minPercent}% – {tier.maxPercent}% collection
                  </p>
                  <p className="text-sm font-medium">{(tier.rate * 100).toFixed(1)}% rate</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Config form */}
        {showConfig && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Configure Goals — {monthLabel(month, year)}</h3>
              <button onClick={() => setShowConfig(false)} className="text-muted-foreground text-xs">Cancel</button>
            </div>

            {/* Base salary */}
            <div>
              <label className="text-sm font-medium block mb-1">Base Salary (₹)</label>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                placeholder="e.g. 25000"
              />
            </div>

            {/* Property targets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Property Targets</label>
                <button
                  onClick={() => setTargets((t) => [...t, { label: '', amount: '' }])}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {targets.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      placeholder="Property name"
                      value={t.label}
                      onChange={(e) => setTargets((ts) => ts.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    <input
                      type="number"
                      placeholder="₹ target"
                      value={t.amount}
                      onChange={(e) => setTargets((ts) => ts.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                      className="w-28 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    {targets.length > 1 && (
                      <button onClick={() => setTargets((ts) => ts.filter((_, j) => j !== i))}>
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Incentive tiers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Incentive Tiers</label>
                <button
                  onClick={() => setTiers((t) => [...t, { minPercent: 0, maxPercent: 100, rate: 0.01 }])}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Min %"
                      value={tier.minPercent}
                      onChange={(e) => setTiers((ts) => ts.map((x, j) => j === i ? { ...x, minPercent: Number(e.target.value) } : x))}
                      className="w-20 border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="number"
                      placeholder="Max %"
                      value={tier.maxPercent}
                      onChange={(e) => setTiers((ts) => ts.map((x, j) => j === i ? { ...x, maxPercent: Number(e.target.value) } : x))}
                      className="w-20 border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Rate"
                      value={tier.rate}
                      onChange={(e) => setTiers((ts) => ts.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))}
                      className="w-20 border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    {tiers.length > 1 && (
                      <button onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))}>
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Rate = fraction of total collected (e.g. 0.02 = 2%)</p>
              </div>
            </div>

            <button
              onClick={() => saveConfig()}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Goals
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
