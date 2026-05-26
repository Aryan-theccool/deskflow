require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix: force Google DNS for SRV record support
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'DeskFlow API is running 🚀', time: new Date() }));
app.use('/tickets', require('./routes/tickets'));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not set in environment'); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });

module.exports = app;
