-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_code TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT CHECK(role IN ('employer', 'booster', 'admin')) NOT NULL,
  red_diamonds REAL DEFAULT 1000.0,
  frozen_diamonds REAL DEFAULT 0.0
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  game_name TEXT NOT NULL,
  game_region TEXT,
  account_info TEXT,
  bounty REAL NOT NULL,
  deposit REAL NOT NULL,
  status INTEGER DEFAULT 0, -- 0:待接单, 1:代练中, 2:待验收, 3:已完成, 4:维权中
  employer_id INTEGER NOT NULL,
  booster_id INTEGER,
  proof_img TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employer_id) REFERENCES users(id),
  FOREIGN KEY(booster_id) REFERENCES users(id)
);

-- 初始化测试账号 (如果不存在)
INSERT OR IGNORE INTO users (id, user_code, username, role, red_diamonds) 
VALUES (1, '000010', '老板A', 'employer', 5000.0);

INSERT OR IGNORE INTO users (id, user_code, username, role, red_diamonds) 
VALUES (2, '000011', '打手B', 'booster', 2000.0);
