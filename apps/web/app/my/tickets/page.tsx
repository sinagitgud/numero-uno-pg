'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { SkeletonList } from '@/components/shared/PageLoader';
import { Plus, ChevronDown, ChevronUp, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface Comment { id: string; message: string; createdAt: string; user: { name: string; role: string } }
interface Ticket {
  id: string; category: string; description: string;
  status: string; createdAt: string;
  comments: Comment[];
}

const CATEGORIES = ['MAINTENANCE','FOOD','CLEANLINESS','WIFI','ROOMMATE','BILLING','GENERAL'] as const;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN:         'bg-blue-100 text-blue-700',
    ACKNOWLEDGED: 'bg-purple-100 text-purple-700',
    IN_PROGRESS:  'bg-yellow-100 text-yellow-700',
    RESOLVED:     'bg-green-100 text-green-700',
    CLOSED:       'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function TenantTicketsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [commentText, setCommentText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () =>
      api.get<{ success: boolean; data: Ticket[] }>('/tickets').then((r) => r.data.data),
  });

  const createTicket = useMutation({
    mutationFn: () => api.post('/tickets', { category, description }),
    onSuccess: () => {
      toast.success('Ticket raised');
      setShowForm(false);
      setDescription('');
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: () => toast.error('Failed to raise ticket'),
  });

  const addComment = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      api.post(`/tickets/${ticketId}/comments`, { message }),
    onSuccess: (_, { ticketId }) => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: () => toast.error('Failed to add comment'),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Support" />

      <div className="p-4 space-y-3">
        {/* Raise ticket button */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Raise a Ticket
        </button>

        {/* New ticket form */}
        {showForm && (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">New Support Request</p>

            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue..."
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => createTicket.mutate()}
                disabled={!description.trim() || createTicket.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-60"
              >
                {createTicket.isPending ? 'Raising…' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {isLoading && <SkeletonList rows={4} />}

        {!isLoading && (!data || data.length === 0) && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-12">No tickets yet.</p>
        )}

        {data?.map((ticket) => (
          <div key={ticket.id} className="bg-card border rounded-xl overflow-hidden">
            {/* Ticket row */}
            <button
              className="w-full p-4 flex items-start justify-between text-left"
              onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ticket.category.charAt(0) + ticket.category.slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="text-sm mt-1.5 line-clamp-2">{ticket.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' · '}{ticket.comments.length} comment{ticket.comments.length !== 1 ? 's' : ''}
                </p>
              </div>
              {expanded === ticket.id
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
            </button>

            {/* Expanded: comments + add comment */}
            {expanded === ticket.id && (
              <div className="border-t px-4 pb-4 space-y-3">
                {ticket.comments.length > 0 && (
                  <div className="pt-3 space-y-2">
                    {ticket.comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <span className="font-medium">{c.user.name}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          ({c.user.role.charAt(0) + c.user.role.slice(1).toLowerCase()})
                        </span>
                        <p className="text-muted-foreground mt-0.5">{c.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                {ticket.status !== 'CLOSED' && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          addComment.mutate({ ticketId: ticket.id, message: commentText.trim() });
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (commentText.trim()) {
                          addComment.mutate({ ticketId: ticket.id, message: commentText.trim() });
                        }
                      }}
                      disabled={!commentText.trim() || addComment.isPending}
                      className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
