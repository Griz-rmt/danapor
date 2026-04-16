const { databases, sdk } = require('./appwrite-config');

async function initDatabase() {
  if (!process.env.APPWRITE_PROJECT_ID) {
    console.error('❌ Appwrite not initialized. Missing APPWRITE_PROJECT_ID.');
    return null;
  }
  console.log('✅ Connected to Appwrite Cloud');
  return databases;
}

function getDb() {
  return databases;
}

function getAppwriteSdk() {
  return sdk;
}

function saveDatabase() {
  // Appwrite auto-saves, no-op for compatibility
}

module.exports = { initDatabase, getDb, saveDatabase, getAppwriteSdk };
