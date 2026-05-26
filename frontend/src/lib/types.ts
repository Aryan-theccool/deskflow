export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  _id: string;
  subject: string;
  description: string;
  customerEmail: string;
  priority: Priority;
  status: Status;
  createdAt: string;
  resolvedAt: string | null;
  ageMinutes: number;
  slaBreached: boolean;
}

export interface Stats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  slaBreachodOpen: number;
}

export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  open:        ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved:    ['in_progress', 'closed'],
  closed:      ['resolved'],
};

export const STATUS_CONFIG: Record<Status, { label: string; color: string; glow: string; dot: string }> = {
  open:        { label: 'Open',        color: 'from-blue-500/20 to-blue-600/10',   glow: 'shadow-blue-500/20',   dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', color: 'from-amber-500/20 to-amber-600/10', glow: 'shadow-amber-500/20',  dot: 'bg-amber-400' },
  resolved:    { label: 'Resolved',    color: 'from-emerald-500/20 to-emerald-600/10', glow: 'shadow-emerald-500/20', dot: 'bg-emerald-400' },
  closed:      { label: 'Closed',      color: 'from-slate-500/20 to-slate-600/10', glow: 'shadow-slate-500/20',  dot: 'bg-slate-400' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; ring: string }> = {
  urgent: { label: 'URGENT', bg: 'bg-red-500/20',    text: 'text-red-300',    ring: 'ring-red-500/40' },
  high:   { label: 'HIGH',   bg: 'bg-orange-500/20', text: 'text-orange-300', ring: 'ring-orange-500/40' },
  medium: { label: 'MEDIUM', bg: 'bg-yellow-500/20', text: 'text-yellow-300', ring: 'ring-yellow-500/40' },
  low:    { label: 'LOW',    bg: 'bg-green-500/20',  text: 'text-green-300',  ring: 'ring-green-500/40' },
};
