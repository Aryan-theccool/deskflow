const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

const SLA_MINUTES = { urgent: 60, high: 240, medium: 1440, low: 4320 };

// Valid transitions: forward one step only, backward one step only
const VALID_TRANSITIONS = {
  open:        ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved:    ['in_progress', 'closed'],
  closed:      ['resolved'],
};

// ─── POST /tickets ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;
    const errors = [];
    if (!subject || !subject.trim())       errors.push('subject is required');
    if (!description || !description.trim()) errors.push('description is required');
    if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) errors.push('customerEmail must be a valid email');
    if (!['low', 'medium', 'high', 'urgent'].includes(priority))  errors.push('priority must be one of: low, medium, high, urgent');
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ticket = await Ticket.create({ subject, description, customerEmail, priority });
    res.status(201).json(ticket.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── GET /tickets/stats ────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const all = await Ticket.find();
    const byStatus   = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    let slaBreachodOpen = 0;

    all.forEach(t => {
      byStatus[t.status]     = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.status === 'open' || t.status === 'in_progress') {
        const ageMin = Math.floor((new Date() - t.createdAt) / 60000);
        if (ageMin > SLA_MINUTES[t.priority]) slaBreachodOpen++;
      }
    });
    res.json({ byStatus, byPriority, slaBreachodOpen });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── GET /tickets ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    const filter = {};
    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status))
        return res.status(400).json({ error: 'Invalid status value' });
      filter.status = status;
    }
    if (priority) {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority))
        return res.status(400).json({ error: 'Invalid priority value' });
      filter.priority = priority;
    }

    let tickets = await Ticket.find(filter).sort({ createdAt: -1 });

    if (breached === 'true') {
      tickets = tickets.filter(t => {
        const target = SLA_MINUTES[t.priority];
        if (t.status === 'resolved' || t.status === 'closed') {
          return t.resolvedAt && Math.floor((t.resolvedAt - t.createdAt) / 60000) > target;
        }
        return Math.floor((new Date() - t.createdAt) / 60000) > target;
      });
    }

    res.json(tickets.map(t => t.toJSON()));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── PATCH /tickets/:id ────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status field is required' });
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status))
      return res.status(400).json({ error: 'Invalid status value' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const allowed = VALID_TRANSITIONS[ticket.status];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid transition: '${ticket.status}' → '${status}' is not allowed`,
        allowedTransitions: allowed,
      });
    }

    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (ticket.status === 'resolved') {
      ticket.resolvedAt = null; // moving back clears resolvedAt
    }
    ticket.status = status;
    await ticket.save();
    res.json(ticket.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Ticket not found' });
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── DELETE /tickets/:id ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted', id: req.params.id });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Ticket not found' });
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;
