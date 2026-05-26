'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Ticket, Stats, Status, Priority, VALID_TRANSITIONS, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/types';
import { fetchTickets, fetchStats, createTicket, moveTicket, deleteTicket } from '@/lib/api';

const STATUSES: Status[] = ['open', 'in_progress', 'resolved', 'closed'];

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}

// ─── Create Ticket Modal ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Ticket) => void }) {
  const [form, setForm] = useState({ subject: '', description: '', customerEmail: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const ticket = await createTicket(form);
      onCreate(ticket);
      onClose();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box glass w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Support Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">Subject *</label>
            <input className="form-input" placeholder="Brief summary of the issue" value={form.subject}
              onChange={e => set('subject', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea className="form-input resize-none" rows={3} placeholder="Detailed description..."
              value={form.description} onChange={e => set('description', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">Customer Email *</label>
            <input className="form-input" type="email" placeholder="customer@example.com" value={form.customerEmail}
              onChange={e => set('customerEmail', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">Priority *</label>
            <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="low">Low — 72h SLA</option>
              <option value="medium">Medium — 24h SLA</option>
              <option value="high">High — 4h SLA</option>
              <option value="urgent">Urgent — 1h SLA</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-300 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:border-white/20 hover:text-white transition-all text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({
  ticket, index, onMove, onDelete,
}: {
  ticket: Ticket; index: number;
  onMove: (id: string, s: Status) => void;
  onDelete: (id: string) => void;
}) {
  const p = PRIORITY_CONFIG[ticket.priority];
  const validMoves = VALID_TRANSITIONS[ticket.status];
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(ticket._id);
  };

  return (
    <Draggable draggableId={ticket._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`ticket-card glass rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl shadow-indigo-500/30 scale-[1.02] border-indigo-500/40' : ''}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white leading-tight flex-1 line-clamp-2">{ticket.subject}</h3>
            <button onClick={handleDelete} disabled={deleting}
              className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{ticket.description}</p>

          {/* Email */}
          <p className="text-xs text-indigo-400/70 mb-3 truncate">{ticket.customerEmail}</p>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${p.bg} ${p.text} ${p.ring}`}>
              {p.label}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatAge(ticket.ageMinutes)}
            </span>
            {ticket.slaBreached && (
              <span className="sla-pulse text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 ring-1 ring-red-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                SLA
              </span>
            )}
          </div>

          {/* Transition buttons */}
          {validMoves.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {validMoves.map(next => (
                <button key={next} onClick={() => onMove(ticket._id, next)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                    STATUS_CONFIG[next].dot === 'bg-emerald-400'
                      ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                      : next === 'closed'
                      ? 'border-slate-500/30 text-slate-300 hover:bg-slate-500/10'
                      : next === 'open'
                      ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10'
                      : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
                  }`}>
                  → {STATUS_CONFIG[next].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────
function BoardColumn({ status, tickets, onMove, onDelete }: {
  status: Status; tickets: Ticket[];
  onMove: (id: string, s: Status) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const breachedCount = tickets.filter(t => t.slaBreached).length;
  return (
    <div className="flex flex-col w-72 flex-shrink-0 h-full">
      {/* Column Header */}
      <div className={`flex items-center justify-between mb-3 px-1`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <h2 className="text-sm font-bold text-slate-200">{cfg.label}</h2>
          <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium">{tickets.length}</span>
        </div>
        {breachedCount > 0 && (
          <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 sla-pulse inline-block" />
            {breachedCount} breached
          </span>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`board-column-scroll flex-1 rounded-2xl p-3 border transition-all duration-200 ${
              snapshot.isDraggingOver ? 'is-dragging-over' : 'border-white/5 bg-white/[0.02]'
            }`}
            style={{ minHeight: '120px' }}
          >
            {tickets.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs">No tickets</p>
              </div>
            )}
            {tickets.map((ticket, i) => (
              <TicketCard key={ticket._id} ticket={ticket} index={i} onMove={onMove} onDelete={onDelete} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Open',        value: stats.byStatus.open        || 0, color: 'text-blue-400' },
    { label: 'In Progress', value: stats.byStatus.in_progress || 0, color: 'text-amber-400' },
    { label: 'Resolved',    value: stats.byStatus.resolved    || 0, color: 'text-emerald-400' },
    { label: 'Closed',      value: stats.byStatus.closed      || 0, color: 'text-slate-400' },
    { label: 'SLA Breached (open)', value: stats.slaBreachodOpen || 0, color: 'text-red-400' },
  ];
  return (
    <div className="glass rounded-2xl px-6 py-4 mb-5 flex flex-wrap gap-8">
      {items.map(it => (
        <div key={it.label} className="flex flex-col">
          <span className={`text-2xl font-bold ${it.color}`}>{it.value}</span>
          <span className="text-xs text-slate-500 mt-0.5 font-medium">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ priority, breached, onPriority, onBreached }: {
  priority: string; breached: boolean;
  onPriority: (v: string) => void; onBreached: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
      <select
        value={priority}
        onChange={e => onPriority(e.target.value)}
        className="form-input !w-auto text-xs py-2"
        style={{ width: 'auto', minWidth: '140px' }}
      >
        <option value="">All Priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button
        onClick={() => onBreached(!breached)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
          breached
            ? 'bg-red-500/20 border-red-500/40 text-red-300'
            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${breached ? 'bg-red-400 sla-pulse' : 'bg-slate-500'}`} />
        SLA Breached Only
      </button>
      {(priority || breached) && (
        <button onClick={() => { onPriority(''); onBreached(false); }}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors">
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [priority, setPriority] = useState('');
  const [breached, setBreached] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]       = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        fetchTickets({ priority: priority || undefined, breached: breached || undefined }),
        fetchStats(),
      ]);
      setTickets(t); setStats(s);
    } catch { showToast('Failed to load data'); }
    finally { setLoading(false); }
  }, [priority, breached]);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const getCol = (s: Status) => tickets.filter(t => t.status === s);

  const handleMove = async (id: string, newStatus: Status) => {
    const prev = tickets.find(t => t._id === id);
    if (!prev) return;
    // Optimistic update
    setTickets(ts => ts.map(t => t._id === id ? { ...t, status: newStatus } : t));
    try { await moveTicket(id, newStatus); load(); }
    catch (err: any) { showToast(err.message || 'Move failed'); setTickets(ts => ts.map(t => t._id === id ? { ...t, status: prev.status } : t)); }
  };

  const handleDelete = async (id: string) => {
    setTickets(ts => ts.filter(t => t._id !== id));
    try { await deleteTicket(id); load(); }
    catch { showToast('Delete failed'); load(); }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const from = source.droppableId as Status;
    const to   = destination.droppableId as Status;
    if (!VALID_TRANSITIONS[from].includes(to)) {
      showToast(`❌ Cannot move: "${from.replace('_',' ')}" → "${to.replace('_',' ')}" is not allowed`);
      return;
    }
    await handleMove(draggableId, to);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', top:'-10%', left:'20%', width:'40%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'-10%', right:'20%', width:'40%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/30 backdrop-blur-xl px-6 py-4 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-none">
                DeskFlow
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium tracking-wide">SUPPORT TRIAGE BOARD</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Ticket
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 flex flex-col px-6 py-5 max-w-screen-2xl mx-auto w-full">
        {stats && <StatsStrip stats={stats} />}
        <FilterBar priority={priority} breached={breached} onPriority={setPriority} onBreached={setBreached} />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">Loading tickets…</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
              {STATUSES.map(status => (
                <BoardColumn key={status} status={status} tickets={getCol(status)} onMove={handleMove} onDelete={handleDelete} />
              ))}
            </div>
          </DragDropContext>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={t => { setTickets(prev => [t, ...prev]); load(); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast fixed bottom-6 left-1/2 bg-slate-800 border border-white/10 text-white text-sm px-5 py-3 rounded-xl shadow-2xl z-50 max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
