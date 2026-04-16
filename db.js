const { db } = require('./firebase-config');

async function initDatabase() {
  if (!db) {
    console.error('❌ Firestore not initialized. Check your credentials.');
    return null;
  }
  console.log('✅ Connected to Firebase Firestore');
  return db;
}

function getDb() {
  return db;
}

function saveDatabase() {
  // Firestore auto-saves, no-op for compatibility
}

module.exports = { initDatabase, getDb, saveDatabase };
