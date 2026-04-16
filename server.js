const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'danapor-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  async function start() {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Danapor berjalan di http://localhost:${PORT}`);
    });
  }
  start();
} else {
  // For Vercel, we need to export the app and ensure DB is initialized
  initDatabase().catch(err => console.error('DB Init Error:', err));
}

module.exports = app;
