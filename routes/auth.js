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
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    // Check if email already exists
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('users').add(newUser);
    const userId = docRef.id;

    req.session.userId = userId;

    res.json({ 
      success: true, 
      user: { id: userId, name, email } 
    });
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
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    req.session.userId = userId;

    res.json({ 
      success: true, 
      user: { id: userId, name: userData.name, email: userData.email } 
    });
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
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Belum login' });
  }

  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const userDoc = await db.collection('users').doc(req.session.userId).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    const userData = userDoc.data();
    res.json({ id: userDoc.id, name: userData.name, email: userData.email });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
