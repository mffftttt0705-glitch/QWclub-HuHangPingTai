-- ============================================
-- QW电竞护航平台 - D1数据库初始化脚本
-- 适用于 Cloudflare Workers D1
-- ============================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT UNIQUE,
    email TEXT NOT UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    status INTEGER DEFAULT 1, -- 1:正常 0:禁用
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. 护航师表
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    verification_status INTEGER DEFAULT 0, -- 0:未审核 1:已审核 2:拒绝
    verification_code TEXT,
    total_earnings REAL DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    status INTEGER DEFAULT 1, -- 1:在线 0:离线 2:休息中
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 游戏分类表
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    category TEXT DEFAULT 'pc', -- pc, mobile, console
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. 服务类型表
CREATE TABLE IF NOT EXISTS service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    base_price REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 5. 护航师游戏技能表
CREATE TABLE IF NOT EXISTS player_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    service_type_id INTEGER NOT NULL,
    level TEXT NOT NULL, -- 段位/等级
    price_per_hour REAL NOT NULL,
    win_rate REAL DEFAULT 0,
    max_sessions INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE
);

-- 6. 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    game_account TEXT,
    contact_info TEXT,
    start_time TEXT NOT NULL,
    duration_hours INTEGER DEFAULT 1,
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    pay_amount REAL NOT NULL,
    status INTEGER DEFAULT 0, -- 0:待支付 1:待服务 2:进行中 3:已完成 4:已取消 5:退款中 6:已退款
    payment_method TEXT,
    payment_time TEXT,
    cancel_reason TEXT,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES player_skills(id) ON DELETE CASCADE
);

-- 7. 支付记录表
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- wechat, alipay, balance
    transaction_id TEXT,
    payment_status INTEGER DEFAULT 0, -- 0:待支付 1:已支付 2:支付失败
    payment_time TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    discount_type INTEGER NOT NULL, -- 1:满减 2:折扣
    discount_value REAL NOT NULL, -- 满减金额或折扣率(0.1-1.0)
    min_amount REAL DEFAULT 0, -- 最低消费金额
    max_discount REAL, -- 最大折扣金额
    total_quantity INTEGER DEFAULT 0, -- 0表示不限量
    used_quantity INTEGER DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 9. 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    status INTEGER DEFAULT 0, -- 0:未使用 1:已使用 2:已过期
    order_id INTEGER,
    used_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- 10. 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    skill_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES player_skills(id) ON DELETE SET NULL,
    UNIQUE(user_id, player_id)
);

-- 11. 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    rating INTEGER NOT NULL, -- 1-5星
    content TEXT,
    images TEXT, -- JSON数组
    is_anonymous INTEGER DEFAULT 0,
    player_reply TEXT,
    player_reply_time TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 12. 举报表
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL, -- player, order, review
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    images TEXT,
    status INTEGER DEFAULT 0, -- 0:待处理 1:已处理 2:已忽略
    handler_id INTEGER,
    handle_result TEXT,
    handle_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 14. 日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    operation TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 创建索引以优化查询性能
-- ============================================

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 护航师索引
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_verification ON players(verification_status);

-- 游戏索引
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_is_active ON games(is_active);

-- 技能索引
CREATE INDEX IF NOT EXISTS idx_player_skills_player_id ON player_skills(player_id);
CREATE INDEX IF NOT EXISTS idx_player_skills_game_id ON player_skills(game_id);
CREATE INDEX IF NOT EXISTS idx_player_skills_service_type ON player_skills(service_type_id);
CREATE INDEX IF NOT EXISTS idx_player_skills_is_active ON player_skills(is_active);

-- 订单索引
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_player_id ON orders(player_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_start_time ON orders(start_time);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 支付索引
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- 优惠券索引
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_end_time ON coupons(end_time);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_status ON user_coupons(status);

-- 收藏索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_player_id ON favorites(player_id);

-- 评价索引
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_player_id ON reviews(player_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_active ON reviews(is_active);

-- 举报索引
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- 日志索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON operation_logs(operation);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- ============================================
-- 初始化数据
-- ============================================

-- 插入游戏分类
INSERT OR IGNORE INTO games (name, icon, category, description, sort_order) VALUES
('英雄联盟', '🛡️', 'pc', '经典MOBA竞技游戏', 1),
('王者荣耀', '👑', 'mobile', '手机MOBA竞技游戏', 2),
('CS:GO', '🔫', 'pc', '经典FPS射击游戏', 3),
('绝地求生', '🎯', 'pc', '大逃杀生存射击游戏', 4),
('和平精英', '🎖️', 'mobile', '手机大逃杀游戏', 5),
('无畏契约', '⚡', 'pc', '5V5战术射击游戏', 6),
('DOTA2', '⚔️', 'pc', '经典MOBA竞技游戏', 7),
('永劫无间', '⚡', 'pc', '多人动作竞技游戏', 8);

-- 插入服务类型
INSERT OR IGNORE INTO service_types (name, icon, description, base_price, sort_order) VALUES
('上分护航', '📈', '快速提升游戏段位', 200, 1),
('私人陪练', '👤', '一对一专属陪练服务', 250, 2),
('娱乐陪玩', '🎭', '轻松娱乐游戏体验', 150, 3),
('教学指导', '📚', '专业技能提升教学', 350, 4),
('代练冲分', '🚀', '高效代练快速上分', 300, 5);

-- 插入系统配置
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('platform_name', 'QW电竞护航', '平台名称'),
('platform_version', '1.0.0', '平台版本'),
('platform_contact', 'support@qw-esports.com', '联系邮箱'),
('platform_qq', '123456789', '客服QQ'),
('platform_wechat', 'qw_esports', '客服微信'),
('commission_rate', '0.2', '平台抽成比例'),
('min_withdraw_amount', '100', '最低提现金额'),
('refund_time_limit', '24', '退款时间限制(小时)'),
('max_session_hours', '8', '单次服务最大时长(小时)');

-- ============================================
-- 视图：护航师排行榜
-- ============================================

CREATE VIEW IF NOT EXISTS player_ranking AS
SELECT 
    p.id,
    p.name,
    p.avatar_url,
    p.total_orders,
    p.rating,
    COALESCE(ps.avg_price, 0) as avg_price,
    COALESCE(ps.avg_win_rate, 0) as avg_win_rate
FROM players p
LEFT JOIN (
    SELECT 
        player_id,
        AVG(price_per_hour) as avg_price,
        AVG(win_rate) as avg_win_rate
    FROM player_skills
    WHERE is_active = 1
    GROUP BY player_id
) ps ON p.id = ps.player_id
WHERE p.status = 1
AND p.verification_status = 1
ORDER BY p.total_orders DESC, p.rating DESC;

-- ============================================
-- 视图：热门游戏统计
-- ============================================

CREATE VIEW IF NOT EXISTS game_statistics AS
SELECT 
    g.id,
    g.name,
    g.icon,
    COUNT(DISTINCT ps.id) as player_count,
    COUNT(DISTINCT o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COALESCE(AVG(ps.win_rate), 0) as avg_win_rate
FROM games g
LEFT JOIN player_skills ps ON g.id = ps.game_id AND ps.is_active = 1
LEFT JOIN orders o ON ps.id = o.skill_id AND o.status IN (2, 3)
GROUP BY g.id, g.name, g.icon
ORDER BY order_count DESC;

-- ============================================
-- 视图：订单状态统计
-- ============================================

CREATE VIEW IF NOT EXISTS order_statistics AS
SELECT 
    CASE 
        WHEN status = 0 THEN '待支付'
        WHEN status = 1 THEN '待服务'
        WHEN status = 2 THEN '进行中'
        WHEN status = 3 THEN '已完成'
        WHEN status = 4 THEN '已取消'
        WHEN status = 5 THEN '退款中'
        WHEN status = 6 THEN '已退款'
        ELSE '未知'
    END as status_name,
    COUNT(*) as order_count,
    COALESCE(SUM(pay_amount), 0) as total_amount
FROM orders
GROUP BY status
ORDER BY status;

-- ============================================
-- 完成初始化
-- ============================================

SELECT 'QW电竞护航平台数据库初始化完成！' as message;