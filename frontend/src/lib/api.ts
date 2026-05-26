import { Ticket, Stats } from './types';

const API = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchTickets(params?: { priority?: string; breached?: boolean }): Promise<Ticket[]> {
  const q = new URLSearchParams();
  if (params?.priority) q.set('priority', params.priority);
  if (params?.breached)  q.set('breached', 'true');
  const res = await fetch(`${API()}/tickets?${q}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API()}/tickets/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function createTicket(body: { subject: string; description: string; customerEmail: string; priority: string }): Promise<Ticket> {
  const res = await fetch(`${API()}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details?.join(', ') || data.error || 'Failed to create ticket');
  return data;
}

export async function moveTicket(id: string, status: string): Promise<Ticket> {
  const res = await fetch(`${API()}/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update ticket');
  return data;
}

export async function deleteTicket(id: string): Promise<void> {
  const res = await fetch(`${API()}/tickets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete ticket');
}
