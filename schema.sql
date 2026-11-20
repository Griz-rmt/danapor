-- Skema database Danapor untuk MySQL / phpMyAdmin
-- Import file ini di phpMyAdmin (tab "Import"), atau jalankan manual.
-- Nama database harus sama dengan DB_NAME di file .env (default: danapor).

CREATE DATABASE IF NOT EXISTS danapor
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE danapor;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
