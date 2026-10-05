const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 连接 SQLite 数据库 (本地测试用 database.db)
const db = new sqlite3.Database('./database.db');

// 生成简单 token（与主站兼容：随机串.userId）
function generateToken(userId) {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8) + '.' + userId;
}

// 从 Authorization 头解析 userId
function getUserIdFromAuth(req) {
    const auth = req.headers.authorization || '';
    const parts = auth.split('.');
    if (parts.length >= 2) return parts[parts.length - 1];
    return null;
}

// 初始化 / 升级表结构
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_code TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('employer', 'booster', 'admin')),
        balance REAL DEFAULT 0.00,
        frozen_deposit REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        is_accepting INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        display_id TEXT UNIQUE NOT NULL,
        employer_id INTEGER NOT NULL,
        booster_id INTEGER DEFAULT NULL,
        title TEXT NOT NULL,
        game_name TEXT NOT NULL,
        game_region TEXT,
        time_limit TEXT,
        description TEXT,
        bounty REAL NOT NULL,
        deposit REAL DEFAULT 0.00,
        status INTEGER DEFAULT 0,
        proof_img TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 兼容旧库：尝试添加新字段（已存在则忽略）
    db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN is_accepting INTEGER DEFAULT 0`, () => {});

    // 默认创建系统管理员账号：admin / admin123
    db.run(`INSERT OR IGNORE INTO users (id, user_code, username, password_hash, role, balance, status, is_accepting) 
            VALUES (1, 'ADM001', 'admin', 'admin123', 'admin', 0.00, 'active', 0)`);
});

// ==================== 1. 用户认证与控制接口 ====================

// 用户登录（返回 token，兼容控制终端）
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: '用户不存在' });
        if (user.password_hash !== password) return res.status(400).json({ error: '密码错误' });
        if (user.status === 'banned') return res.status(400).json({ error: '账号已被封禁' });
        if (user.role === 'booster' && user.status !== 'active') {
            return res.status(400).json({ error: '打手账号待审核，请联系管理员通过后再登录' });
        }

        const token = generateToken(user.id);
        const userInfo = {
            id: user.id,
            user_code: user.user_code,
            username: user.username,
            role: user.role,
            balance: user.balance || 0,
            frozen_deposit: user.frozen_deposit || 0,
            status: user.status || 'active',
            is_accepting: Number(user.is_accepting) || 0,
            diamond: user.balance || 0   // 兼容控制终端显示
        };
        res.json({ success: true, token, user: userInfo });
    });
});

// 用户注册（打手默认待审核）
app.post('/api/register', (req, res) => {
    const { username, password, role, adminKey } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });

    let finalRole = role || 'employer';
    // 公开注册禁止直接注册管理员，除非提供正确密钥
    if (finalRole === 'admin') {
        if (adminKey !== 'admin888') {
            return res.status(400).json({ error: '管理员注册密钥不正确！' });
        }
    }
    if (!['employer', 'booster', 'admin'].includes(finalRole)) {
        finalRole = 'employer';
    }

    const prefix = finalRole === 'admin' ? 'ADM' : (finalRole === 'employer' ? 'EMP' : 'BST');
    const userCode = prefix + Math.floor(100000 + Math.random() * 900000);
    // 打手注册后默认 pending，需管理员审核
    const userStatus = (finalRole === 'booster') ? 'pending' : 'active';

    const sql = `INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit, status, is_accepting) 
                 VALUES (?, ?, ?, ?, 0.00, 0.00, ?, 0)`;
    db.run(sql, [userCode, username, password, finalRole, userStatus], function(err) {
        if (err) return res.status(400).json({ error: '用户名已占用或注册失败' });
        const msg = finalRole === 'booster' ? '注册成功，请等待管理员审核后再登录接单' : '注册成功';
        res.json({
            success: true,
            message: msg,
            user: {
                id: this.lastID,
                user_code: userCode,
                username,
                role: finalRole,
                balance: 0.00,
                frozen_deposit: 0.00,
                status: userStatus,
                is_accepting: 0,
                diamond: 0
            }
        });
    });
});

// 获取个人资产信息
app.get('/api/user/:id', (req, res) => {
    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit, status, is_accepting FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: '用户不存在' });
        user.is_accepting = Number(user.is_accepting) || 0;
        user.diamond = user.balance || 0;
        res.json(user);
    });
});

// 打手切换接单状态（参考主站 /user/toggle-accepting）
app.post('/api/user/toggle-accepting', (req, res) => {
    const userId = getUserIdFromAuth(req) || req.body.userId;
    if (!userId) return res.status(401).json({ error: '请先登录' });

    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: '用户不存在' });
        if (user.role !== 'booster') return res.status(403).json({ error: '只有打手可以切换接单状态' });
        if (user.status !== 'active') return res.status(403).json({ error: '账号未通过审核，无法开启接单' });

        const newStatus = user.is_accepting ? 0 : 1;
        db.run(`UPDATE users SET is_accepting = ? WHERE id = ?`, [newStatus, userId], (err2) => {
            if (err2) return res.status(500).json({ error: '切换失败' });
            res.json({
                success: true,
                is_accepting: newStatus,
                message: newStatus ? '已开启接单' : '已暂停接单'
            });
        });
    });
});

// ==================== 2. 订单交易流程接口 ====================

// 获取订单列表
app.get('/api/orders/list', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取订单列表失败' });
        res.json(rows);
    });
});

// 发布订单
app.post('/api/orders/create', (req, res) => {
    const { employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit } = req.body;
    if (!employerId || !title || !gameName || bounty == null) {
        return res.status(400).json({ error: '请填写完整订单信息' });
    }
    const displayId = 'QW' + Date.now().toString().slice(-8);

    const sql = `INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [displayId, employerId, title, gameName, gameRegion || '', timeLimit || '', description || '', bounty, deposit || 0], function(err) {
        if (err) return res.status(500).json({ error: '订单发布失败' });
        res.json({ success: true, orderId: this.lastID });
    });
});

// 打手接单（核心逻辑加强：必须 active + 开启接单 + 余额足够）
app.post('/api/orders/accept', (req, res) => {
    const { orderId, boosterId } = req.body;
    if (!orderId || !boosterId) return res.status(400).json({ error: '参数不完整' });

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (err || !order) return res.status(400).json({ error: '订单不存在' });
        if (order.status !== 0) return res.status(400).json({ error: '订单不可接单（已被接或已完成）' });
        if (order.booster_id) return res.status(400).json({ error: '订单已被其他打手接取' });

        db.get(`SELECT * FROM users WHERE id = ?`, [boosterId], (err2, booster) => {
            if (err2 || !booster) return res.status(400).json({ error: '打手账号不存在' });
            if (booster.role !== 'booster') return res.status(403).json({ error: '只有打手角色才能接单' });
            if (booster.status !== 'active') return res.status(403).json({ error: '账号待审核或已被封禁，无法接单' });
            if (!booster.is_accepting) return res.status(403).json({ error: '请先在「我的」页面开启接单状态后再抢单' });
            if ((booster.balance || 0) < (order.deposit || 0)) {
                return res.status(400).json({ error: `可用余额不足！接此单需预扣保证金 ¥${order.deposit}` });
            }

            db.serialize(() => {
                db.run(`UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ?`,
                    [order.deposit, order.deposit, boosterId]);
                db.run(`UPDATE orders SET booster_id = ?, status = 1 WHERE id = ?`, [boosterId, orderId], (err3) => {
                    if (err3) return res.status(500).json({ error: '接单失败' });
                    res.json({ success: true, message: '接单成功，保证金已冻结' });
                });
            });
        });
    });
});

// 打手提交完工凭证
app.post('/api/orders/complete', (req, res) => {
    const { orderId, proofImg } = req.body;
    if (!orderId) return res.status(400).json({ error: '缺少订单ID' });

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 1) return res.status(400).json({ error: '订单状态不允许提交完工' });
        db.run(`UPDATE orders SET proof_img = ?, status = 2 WHERE id = ?`, [proofImg || '', orderId], (err2) => {
            if (err2) return res.status(500).json({ error: '提交完工失败' });
            res.json({ success: true });
        });
    });
});

// 派单员确认验收
app.post('/api/orders/confirm', (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: '缺少订单ID' });

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 2) return res.status(400).json({ error: '订单未处于待验收状态' });
        db.run(`UPDATE orders SET status = 3 WHERE id = ?`, [orderId], (err2) => {
            if (err2) return res.status(500).json({ error: '验收失败' });
            res.json({ success: true });
        });
    });
});

// 管理员一键打款结算 (赏金发放 + 退回保证金)
app.post('/api/orders/admin-settle', (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: '缺少订单ID' });

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 3) return res.status(400).json({ error: '订单未处于可结算状态' });
        if (!order.booster_id) return res.status(400).json({ error: '订单没有关联打手' });

        const totalPay = (order.bounty || 0) + (order.deposit || 0);

        db.serialize(() => {
            db.run(`UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?`,
                [totalPay, order.deposit || 0, order.booster_id]);
            db.run(`UPDATE orders SET status = 4 WHERE id = ?`, [orderId], (err2) => {
                if (err2) return res.status(500).json({ error: '结算失败' });
                res.json({ success: true, message: '结算成功，赏金+保证金已到账' });
            });
        });
    });
});

// ==================== 3. 管理员 / 控制终端兼容接口 ====================

// 获取所有用户（兼容控制终端）
app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, user_code, username, role, balance, frozen_deposit, status, is_accepting, created_at 
            FROM users ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取失败' });
        const list = (rows || []).map(u => ({
            ...u,
            diamond: u.balance || 0,
            is_accepting: Number(u.is_accepting) || 0,
            status: u.status || 'active'
        }));
        res.json(list);
    });
});

// 审核通过打手
app.put('/api/admin/users/:id/approve', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE users SET status = 'active' WHERE id = ? AND role = 'booster'`, [id], function(err) {
        if (err) return res.status(500).json({ error: '操作失败' });
        if (this.changes === 0) return res.status(400).json({ error: '用户不存在或不是待审核打手' });
        res.json({ success: true, message: '已通过审核' });
    });
});

// 封禁用户
app.put('/api/admin/users/:id/ban', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE users SET status = 'banned', is_accepting = 0 WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: '操作失败' });
        res.json({ success: true, message: '已封禁' });
    });
});

// 重置密码（默认重置为 123456）
app.put('/api/admin/users/:id/reset-password', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE users SET password_hash = '123456' WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: '操作失败' });
        res.json({ success: true, message: '密码已重置为 123456' });
    });
});

// 删除用户
app.delete('/api/admin/users/:id', (req, res) => {
    const id = req.params.id;
    if (String(id) === '1') return res.status(400).json({ error: '不能删除超级管理员' });
    db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: '删除失败' });
        res.json({ success: true });
    });
});

// 管理员手动调账 (加/扣余额)
app.post('/api/admin/adjust-balance', (req, res) => {
    const { targetUserId, amount, type } = req.body;
    if (!targetUserId || amount == null) return res.status(400).json({ error: '参数不完整' });
    const adjustVal = type === 'add' ? Number(amount) : -Number(amount);

    db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [adjustVal, targetUserId], function(err) {
        if (err) return res.status(500).json({ error: '调账失败' });
        res.json({ success: true });
    });
});

// 兼容控制终端的红钻操作（映射到 balance）
app.post('/api/admin/gift', (req, res) => {
    const { targetUserId, amount } = req.body;
    if (!targetUserId || !amount) return res.status(400).json({ error: '参数不完整' });
    db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [Number(amount), targetUserId], function(err) {
        if (err) return res.status(500).json({ error: '操作失败' });
        res.json({ success: true, message: '已增加余额' });
    });
});

app.post('/api/admin/deduct', (req, res) => {
    const { targetUserId, amount } = req.body;
    if (!targetUserId || !amount) return res.status(400).json({ error: '参数不完整' });
    db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [Number(amount), targetUserId], function(err) {
        if (err) return res.status(500).json({ error: '操作失败' });
        res.json({ success: true, message: '已扣除余额' });
    });
});

// 获取所有订单（兼容控制终端）
app.get('/api/admin/orders', (req, res) => {
    db.all(`SELECT o.*, 
                   e.username as employer_name, 
                   b.username as booster_name
            FROM orders o
            LEFT JOIN users e ON o.employer_id = e.id
            LEFT JOIN users b ON o.booster_id = b.id
            ORDER BY o.id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取失败' });
        // 映射状态数字到文字，方便控制终端显示
        const statusMap = { 0: 'pending', 1: 'ongoing', 2: 'review', 3: 'settled', 4: 'completed' };
        const list = (rows || []).map(o => ({
            ...o,
            status_text: statusMap[o.status] || 'unknown',
            handler_id: o.booster_id,
            boss_id: o.employer_id
        }));
        res.json(list);
    });
});

// 取消订单
app.put('/api/admin/orders/:id/cancel', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
        if (!order) return res.status(404).json({ error: '订单不存在' });
        // 如果已接单且有保证金，退回给打手
        if (order.booster_id && order.status >= 1 && order.status < 4 && order.deposit > 0) {
            db.run(`UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?`,
                [order.deposit, order.deposit, order.booster_id]);
        }
        db.run(`UPDATE orders SET status = 0, booster_id = NULL WHERE id = ?`, [id], (err2) => {
            if (err2) return res.status(500).json({ error: '取消失败' });
            res.json({ success: true, message: '订单已取消并退回保证金' });
        });
    });
});

// 删除订单
app.delete('/api/admin/orders/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM orders WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: '删除失败' });
        res.json({ success: true });
    });
});

// 兼容旧路径
app.delete('/api/admin/order/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM orders WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: '删除失败' });
        res.json({ success: true });
    });
});

// 健康检查（控制终端会调用）
app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'QW外派平台', time: new Date().toISOString() });
});

// 空实现占位（防止控制终端报错）
app.get('/api/admin/recharges', (req, res) => res.json([]));
app.get('/api/admin/withdrawals', (req, res) => res.json([]));
app.get('/api/shops', (req, res) => res.json([]));
app.get('/api/admin/products', (req, res) => res.json([]));
app.get('/api/announce', (req, res) => res.json({ content: '' }));
app.put('/api/admin/announce', (req, res) => res.json({ success: true }));

app.listen(3000, () => {
    console.log('QW代练外派系统后端服务已启动在端口: 3000');
    console.log('管理员账号: admin / admin123');
});
