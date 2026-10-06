CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_code TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employer','booster','admin')),
  balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
  frozen_deposit REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT NOT NULL,
  employer_id INTEGER NOT NULL,
  booster_id INTEGER,
  title TEXT NOT NULL,
  game_name TEXT NOT NULL,
  game_region TEXT NOT NULL,
  time_limit TEXT NOT NULL,
  description TEXT,
  bounty REAL NOT NULL,
  deposit REAL NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  proof_img TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
