const mysql = require('mysql2/promise');

// Simpan pool di global agar koneksi bisa dipakai ulang antar invocation
// serverless (Vercel) saat fungsi masih "hangat", sehingga tidak membuat
// koneksi baru terus-menerus yang bisa menyebabkan "Too many connections".
let pool = global._danaporPool || null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'danapor',
      waitForConnections: true,
      // Di serverless, batasi koneksi agar tidak menumpuk di MySQL.
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) ||
        (process.env.NODE_ENV === 'production' ? 2 : 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      // Aktifkan jika server MySQL mewajibkan SSL. Isi DB_SSL=true di env.
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    global._danaporPool = pool;
  }
  return pool;
}

async function ensureSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('income','expense') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      money_type VARCHAR(50) NOT NULL,
      source VARCHAR(255) DEFAULT '',
      category VARCHAR(255) DEFAULT 'Lainnya',
      description TEXT,
      date DATE NOT NULL,
      month CHAR(2) NOT NULL,
      year CHAR(4) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_user_period (user_id, year, month),
      CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function initDatabase() {
  const db = getPool();

  // Di production (Vercel) jangan jalankan CREATE TABLE tiap cold start.
  // Buat skema sekali saja lewat schema.sql di phpMyAdmin.
  if (process.env.NODE_ENV !== 'production') {
    await ensureSchema(db);
    const conn = await db.getConnection();
    conn.release();
    console.log(`✅ Terhubung ke MySQL di ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'danapor'}`);
  }

  return db;
}

function getDb() {
  return getPool();
}

module.exports = { initDatabase, getDb };
