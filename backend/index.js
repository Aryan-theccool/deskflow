require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with caching for serverless
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

// Ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) { res.status(500).json({ error: 'Database connection failed' }); }
});

app.get('/', (req, res) => res.json({ status: 'DeskFlow API is running 🚀', time: new Date() }));
app.use('/tickets', require('./routes/tickets'));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Start server unless running on Vercel (serverless)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = app;
