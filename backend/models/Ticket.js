const mongoose = require('mongoose');

const SLA_MINUTES = { urgent: 60, high: 240, medium: 1440, low: 4320 };

const ticketSchema = new mongoose.Schema({
  subject:       { type: String, required: [true, 'subject is required'], trim: true },
  description:   { type: String, required: [true, 'description is required'], trim: true },
  customerEmail: {
    type: String, required: [true, 'customerEmail is required'],
    trim: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'customerEmail must be a valid email']
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: [true, 'priority is required'] },
  status:   { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  createdAt:  { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

ticketSchema.virtual('ageMinutes').get(function () {
  const end = (this.status === 'resolved' || this.status === 'closed') && this.resolvedAt
    ? this.resolvedAt : new Date();
  return Math.floor((end - this.createdAt) / 60000);
});

ticketSchema.virtual('slaBreached').get(function () {
  const target = SLA_MINUTES[this.priority];
  if (this.status === 'resolved' || this.status === 'closed') {
    if (!this.resolvedAt) return false;
    return Math.floor((this.resolvedAt - this.createdAt) / 60000) > target;
  }
  return Math.floor((new Date() - this.createdAt) / 60000) > target;
});

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.SLA_MINUTES = SLA_MINUTES;
