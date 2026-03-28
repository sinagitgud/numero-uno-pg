'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonCard } from '@/components/shared/PageLoader';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  message: string;
  createdAt: string;
  user: { name: string; role: string };
}

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  comments: Comment[];
}

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'FOOD', label: 'Food' },
  { value: 'CLEANLINESS', label: 'Cleanliness' },
  { value: 'WIFI', label: 'WiFi' },
  { value: 'ROOMMATE', label: 'Roommate' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'GENERAL', label: 'General' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Open',        color: 'text-blue-700 bg-blue-100' },
  ACKNOWLEDGED:{ label: 'Acknowledged',color: 'text-purple-700 bg-purple-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-700 bg-yellow-100' },
  RESOLVED:    { label: 'Resolved',    color: 'text-green-700 bg-green-100' },
  CLOSED:      { label: 'Closed',      color: 'text-muted-foreground bg-muted' },
};

export default function TenantSupportPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [category, setCategory] = useState('GENERAL');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: () => api.get<{ success: boolean; data: Ticket[] }>('/tickets').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/tickets', { category, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-tickets'] });
      setShowForm(false);
      setDescription('');
      setCategory('GENERAL');
      toast.success('Request submitted!');
    },
    onError: () => toast.error('Failed to submit. Try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Please describe your issue'); return; }
    createMutation.mutate();
  };

  const tickets = data ?? [];

  if (isLoading) return (
    <div className="pb-20">
      <Header title="Support" />
      <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Support" />

      <div className="p-4 space-y-4">
        {/* New request form */}
        {showForm ? (
          <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Request</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Describe your issue</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. The bathroom tap is leaking..."
                rows={3}
                className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-xl py-3.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}

        {tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No requests yet</div>
        ) : (
          tickets.map(ticket => {
            const isExpanded = expandedId === ticket.id;
            const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;

            return (
              <div key={ticket.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full flex items-start justify-between p-4 text-left gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                        {CATEGORIES.find(c => c.value === ticket.category)?.label ?? ticket.category}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm mt-1.5 line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ticket.comments.length > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MessageCircle className="w-3.5 h-3.5" />{ticket.comments.length}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && ticket.comments.length > 0 && (
                  <div className="px-4 pb-4 border-t pt-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Updates</p>
                    {ticket.comments.map(c => (
                      <div key={c.id} className={`rounded-lg p-3 text-sm ${c.user.role === 'TENANT' ? 'bg-muted ml-4' : 'bg-primary/5 mr-4'}`}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {c.user.name} · {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        <p>{c.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
