const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware – tillad både localhost og HOST_IP (til adgang fra netværket)
const HOST_IP = process.env.HOST_IP || '127.0.0.1';
const allowedOrigins = [
  'http://localhost:3000', 'https://localhost:3000',
  'http://127.0.0.1:3000', 'https://127.0.0.1:3000',
  `http://${HOST_IP}:3000`, `https://${HOST_IP}:3000`,
  `http://${HOST_IP}:80`
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database
const db = require('./database/db');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/music', require('./routes/music'));
app.use('/api/integrations', require('./routes/integrations'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Speaker API is running' });
});

// Initialize database
db.init().then(() => {
  console.log('Database initialized');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

