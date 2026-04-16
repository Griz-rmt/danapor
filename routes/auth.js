const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, getAppwriteSdk } = require('../db');

function getAppwriteDbInfo() {
  return {
    databaseId: process.env.APPWRITE_DATABASE_ID,
    usersCollectionId: process.env.USERS_COLLECTION_ID,
  };
}

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

    const databases = getDb();
    const sdk = getAppwriteSdk();
    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });

    const { databaseId, usersCollectionId } = getAppwriteDbInfo();

    // Check if email already exists
    const snapshot = await databases.listDocuments(
      databaseId,
      usersCollectionId,
      [sdk.Query.equal('email', email)]
    );
    
    if (snapshot.documents.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    const doc = await databases.createDocument(
      databaseId,
      usersCollectionId,
      sdk.ID.unique(),
      newUser
    );
    const userId = doc.$id;

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

    const databases = getDb();
    const sdk = getAppwriteSdk();
    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });

    const { databaseId, usersCollectionId } = getAppwriteDbInfo();

    const snapshot = await databases.listDocuments(
      databaseId,
      usersCollectionId,
      [sdk.Query.equal('email', email)]
    );

    if (snapshot.documents.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const userDoc = snapshot.documents[0];
    const userId = userDoc.$id;

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    req.session.userId = userId;

    res.json({ 
      success: true, 
      user: { id: userId, name: userDoc.name, email: userDoc.email } 
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
    const databases = getDb();
    if (!databases) return res.status(500).json({ error: 'Database not initialized' });

    const { databaseId, usersCollectionId } = getAppwriteDbInfo();

    const userDoc = await databases.getDocument(
      databaseId,
      usersCollectionId,
      req.session.userId
    );

    res.json({ id: userDoc.$id, name: userDoc.name, email: userDoc.email });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
