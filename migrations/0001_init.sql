PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mobile TEXT NOT NULL UNIQUE,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT '1',
  status INTEGER NOT NULL DEFAULT 1,
  money REAL NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  level_id INTEGER DEFAULT 1,
  pid TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_codes (
  mobile TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  event TEXT DEFAULT 'mobilelogin',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  title TEXT NOT NULL,
  logo TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  original_price REAL NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 9999,
  status INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  url TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  goods_id INTEGER,
  thug_id INTEGER,
  title TEXT DEFAULT '',
  pay_price REAL NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  complaint INTEGER NOT NULL DEFAULT 0,
  grade INTEGER DEFAULT 0,
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  type TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT DEFAULT '',
  account TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  channel TEXT DEFAULT 'alipay',
  money REAL NOT NULL DEFAULT 0,
  fee REAL NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  images TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thugs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  available_money REAL NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  online INTEGER NOT NULL DEFAULT 1,
  score REAL NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type INTEGER NOT NULL DEFAULT 1,
  content TEXT DEFAULT '',
  images TEXT DEFAULT '',
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT DEFAULT '',
  mime TEXT DEFAULT 'application/octet-stream',
  body_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

INSERT OR IGNORE INTO settings(key,value) VALUES
 ('site_name','鸡无系统'),
 ('site_logo','/static/eon.png'),
 ('min_withdraw','10'),
 ('fee_rate','0'),
 ('sms_dev_code','1234');

INSERT OR IGNORE INTO categories(id,name,icon,sort) VALUES
 (1,'热门推荐','/static/images/classify.png',1),
 (2,'陪玩服务','/static/images/Star.png',2),
 (3,'休闲娱乐','/static/images/normal.png',3);

INSERT OR IGNORE INTO goods(id,category_id,title,logo,description,price,original_price,sales,stock,sort) VALUES
 (1,1,'新手体验服务','/static/material/Image_1775401713916_143.png','演示商品，可用于验证订单流程',9.90,19.90,12,9999,1),
 (2,2,'专业陪玩服务','/static/material/Image_1775401787921_378.png','演示陪玩商品',29.90,49.90,8,9999,2),
 (3,3,'休闲娱乐套餐','/static/material/Image_1777100285578_188.jpg','演示娱乐套餐',49.90,79.90,5,9999,3);

INSERT OR IGNORE INTO banners(id,image,url,sort) VALUES
 (1,'/static/material/slide.png','/pagesA/index/search',1);

INSERT OR IGNORE INTO notices(id,title,content,status) VALUES
 (1,'系统公告','欢迎使用鸡无系统。当前为 Cloudflare Pages + D1 版本。',1),
 (2,'测试说明','短信验证码默认使用 1234；正式上线前请接入短信服务商。',1);

INSERT OR IGNORE INTO customer_services(id,name,avatar,status) VALUES
 (1,'在线客服','/static/icon/default_avatar.png',1);

INSERT OR IGNORE INTO levels(id,name,score,price) VALUES
 (1,'普通用户',0,0),
 (2,'VIP 会员',100,9.90),
 (3,'高级会员',500,29.90);
