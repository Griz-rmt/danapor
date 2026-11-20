const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

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

    // Cek email sudah terdaftar
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;
    req.session.userId = userId;

    res.json({
      success: true,
      user: { id: userId, name, email }
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
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

    const [rows] = await db.query(
      'SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    req.session.userId = user.id;

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Belum login' });
  }

  try {
    const db = getDb();
    const [rows] = await db.query(
      'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Belum login' });
    }

    const user = rows[0];
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
