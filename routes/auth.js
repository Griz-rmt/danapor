const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, saveDatabase } = require('../db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const db = getDb();

    // Check if email already exists
    const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    saveDatabase();

    // Get the newly created user
    const result = db.exec('SELECT id, name, email FROM users WHERE email = ?', [email]);
    const user = {
      id: result[0].values[0][0],
      name: result[0].values[0][1],
      email: result[0].values[0][2]
    };

    req.session.userId = user.id;

    res.json({ success: true, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const db = getDb();
    const result = db.exec('SELECT id, name, email, password FROM users WHERE email = ?', [email]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const row = result[0].values[0];
    const user = { id: row[0], name: row[1], email: row[2] };
    const hashedPassword = row[3];

    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    req.session.userId = user.id;

    res.json({ success: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal logout' });
    }
    res.json({ success: true });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Belum login' });
  }

  const db = getDb();
  const result = db.exec('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);

  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(401).json({ error: 'User tidak ditemukan' });
  }

  const row = result[0].values[0];
  res.json({ id: row[0], name: row[1], email: row[2] });
});

module.exports = router;
