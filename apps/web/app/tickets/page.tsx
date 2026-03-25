'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonRow } from '@/components/shared/PageLoader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  message: string;
  createdAt: string;
  user: { name: string; role: string };
}

interface TicketItem {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  tenant?: { user: { name: string } };
  comments: Comment[];
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const { data, isLoading, error } = useQuery<{ data: TicketItem[] }>({
    queryKey: ['tickets', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/tickets', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
    refetchInterval: 10_000, // 10s polling
  });

  const tickets = data?.data ?? [];
  const openCount = tickets.filter((t) => ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length;

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/tickets/${id}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Status updated ✓');
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const addComment = async (ticketId: string) => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await api.post(`/tickets/${ticketId}/comments`, { message: comment.trim() });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setComment('');
      toast.success('Comment added ✓');
    } catch {
      toast.error('Failed to add comment.');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div>
      <Header title={`Tickets${openCount > 0 ? ` (${openCount} open)` : ''}`} />
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

        {/* Ticket list */}
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            [1,2,3].map(i => <SkeletonRow key={i} cols={3} />)
          ) : error ? (
            <p className="px-4 py-6 text-sm text-destructive text-center">Failed to load tickets. Pull to refresh.</p>
          ) : tickets.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No open tickets. Things are running smoothly.
            </p>
          ) : tickets.map((t) => (
            <div key={t.id} className="border-b last:border-0">
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="w-full flex items-start justify-between px-4 py-3 hover:bg-muted/50 text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{t.tenant?.user.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {formatDate(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? ''}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === t.id ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === t.id && (
                <div className="px-4 pb-4 space-y-3 bg-muted/30">
                  <p className="text-sm">{t.description}</p>

                  {/* Status update */}
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus({ id: t.id, status: s })}
                        className="px-3 py-1 rounded-lg border text-xs font-medium hover:bg-background transition-colors"
                      >
                        → {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Comments */}
                  {t.comments.length > 0 && (
                    <div className="space-y-2">
                      {t.comments.map((c) => (
                        <div key={c.id} className="bg-background rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground">{c.user.name} · {c.user.role}</p>
                          <p className="text-sm mt-0.5">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-background"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(t.id); } }}
                    />
                    <button
                      onClick={() => addComment(t.id)}
                      disabled={sendingComment || !comment.trim()}
                      className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                    >
                      {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
