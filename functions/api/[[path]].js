const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 连接 SQLite 数据库
const db = new sqlite3.Database('./database.db');

// 初始化数据库表结构与默认数据
db.serialize(() => {
    // 1. 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_code TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('employer', 'booster', 'admin')),
        balance REAL DEFAULT 0.00,
        frozen_deposit REAL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. 订单表
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employer_id) REFERENCES users(id),
        FOREIGN KEY (booster_id) REFERENCES users(id)
    )`);

    // 自动插入默认管理员账号：admin / admin123
    db.run(`INSERT OR IGNORE INTO users (id, user_code, username, password_hash, role, balance) 
            VALUES (1, 'ADM001', 'admin', 'admin123', 'admin', 0.00)`);
});

// ==================== 1. 用户认证与基础接口 ====================

// 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit, password_hash FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: '账号不存在' });
        if (user.password_hash !== password) return res.status(400).json({ error: '密码输入不正确' });
        
        const { password_hash, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    });
});

// 用户注册
app.post('/api/register', (req, res) => {
    const { username, password, role, adminKey } = req.body;

    if (role === 'admin' && adminKey !== 'admin888') {
        return res.status(400).json({ error: '管理员注册密钥不正确！' });
    }

    const prefix = role === 'admin' ? 'ADM' : (role === 'employer' ? 'EMP' : 'BST');
    const userCode = prefix + Math.floor(100000 + Math.random() * 900000);

    const sql = `INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit) VALUES (?, ?, ?, ?, 0.00, 0.00)`;
    db.run(sql, [userCode, username, password, role], function(err) {
        if (err) return res.status(400).json({ error: '用户名已占用或注册失败' });
        res.json({
            success: true,
            user: { id: this.lastID, user_code: userCode, username, role, balance: 0.00, frozen_deposit: 0.00 }
        });
    });
});

// 获取指定用户信息
app.get('/api/user/:id', (req, res) => {
    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: '用户不存在' });
        res.json(user);
    });
});

// ==================== 2. 订单交易流程接口 ====================

// 获取大厅订单列表
app.get('/api/orders/list', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取订单列表失败' });
        res.json(rows);
    });
});

// 发布订单
app.post('/api/orders/create', (req, res) => {
    const { employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit } = req.body;
    const displayId = 'QW' + Date.now().toString().slice(-8);

    const sql = `INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [displayId, employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit], function(err) {
        if (err) return res.status(500).json({ error: '订单发布失败' });
        res.json({ success: true, orderId: this.lastID });
    });
});

// 打手接单 (扣除并冻结保证金)
app.post('/api/orders/accept', (req, res) => {
    const { orderId, boosterId } = req.body;

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 0) return res.status(400).json({ error: '订单已被抢或状态不可接' });

        db.get(`SELECT balance FROM users WHERE id = ?`, [boosterId], (err, booster) => {
            if (!booster || booster.balance < order.deposit) {
                return res.status(400).json({ error: `余额不足！接此单需要预扣保证金 ¥${order.deposit}` });
            }

            db.serialize(() => {
                db.run(`UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ?`, [order.deposit, order.deposit, boosterId]);
                db.run(`UPDATE orders SET booster_id = ?, status = 1 WHERE id = ?`, [boosterId, orderId], (err) => {
                    res.json({ success: true });
                });
            });
        });
    });
});

// 打手提交完工凭证
app.post('/api/orders/complete', (req, res) => {
    const { orderId, proofImg } = req.body;
    db.run(`UPDATE orders SET proof_img = ?, status = 2 WHERE id = ?`, [proofImg, orderId], (err) => {
        if (err) return res.status(500).json({ error: '提交完工失败' });
        res.json({ success: true });
    });
});

// 派单员确认验收
app.post('/api/orders/confirm', (req, res) => {
    const { orderId } = req.body;
    db.run(`UPDATE orders SET status = 3 WHERE id = ?`, [orderId], (err) => {
        if (err) return res.status(500).json({ error: '验收确认失败' });
        res.json({ success: true });
    });
});

// 管理员一键打款结算
app.post('/api/orders/admin-settle', (req, res) => {
    const { orderId } = req.body;

    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 3) return res.status(400).json({ error: '订单未处于可结算状态' });

        const totalPay = order.bounty + order.deposit;

        db.serialize(() => {
            db.run(`UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?`, [totalPay, order.deposit, order.booster_id]);
            db.run(`UPDATE orders SET status = 4 WHERE id = ?`, [orderId], (err) => {
                res.json({ success: true });
            });
        });
    });
});

// ==================== 3. 管理员控制台接口 ====================

// 获取用户列表
app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, user_code, username, role, balance, frozen_deposit FROM users ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取用户列表失败' });
        res.json(rows);
    });
});

// 手动调账 (加/扣余额)
app.post('/api/admin/adjust-balance', (req, res) => {
    const { targetUserId, amount, type } = req.body;
    const adjustVal = type === 'add' ? Number(amount) : -Number(amount);

    db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [adjustVal, targetUserId], (err) => {
        if (err) return res.status(500).json({ error: '调账失败' });
        res.json({ success: true });
    });
});

// 管理员删除订单
app.delete('/api/admin/order/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: '删除订单失败' });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log('QW电竞外派后台服务运行于端口: 3000'));
