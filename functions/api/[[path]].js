
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 连接 SQLite 数据库 (如部署至 Cloudflare Workers/Pages，请替换为 env.DB.prepare)
const db = new sqlite3.Database('./database.db');

// 初始化数据库结构
db.serialize(() => {
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

    // 默认创建/重置系统管理员账号：admin / admin123
    db.run(`INSERT OR REPLACE INTO users (id, user_code, username, password_hash, role, balance, frozen_deposit) 
            VALUES (1, 'ADM001', 'admin', 'admin123', 'admin', 10000.00, 0.00)`);
});

// ==================== 1. 用户认证与登录/注册接口 (已修复) ====================

// 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '请输入账号名称和密码' });
    }

    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit, password_hash FROM users WHERE username = ?`, [username.trim()], (err, user) => {
        if (err) {
            console.error("登录数据库查询失败:", err);
            return res.status(500).json({ error: '数据库查询失败，请稍后重试' });
        }
        if (!user) {
            return res.status(400).json({ error: '账号不存在，请检查或先注册账号' });
        }
        if (user.password_hash !== password.trim()) {
            return res.status(400).json({ error: '密码错误，请重新输入' });
        }
        
        const { password_hash, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    });
});

// 用户注册
app.post('/api/register', (req, res) => {
    const { username, password, role, adminKey } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: '请完整填写注册信息' });
    }

    // 管理员注册校验
    if (role === 'admin' && adminKey !== 'admin888') {
        return res.status(400).json({ error: '管理员注册授权密钥不正确！' });
    }

    // 先检查用户名是否重复
    db.get(`SELECT id FROM users WHERE username = ?`, [username.trim()], (err, row) => {
        if (row) {
            return res.status(400).json({ error: '该账号名称已被注册，请更换名称' });
        }

        const prefix = role === 'admin' ? 'ADM' : (role === 'employer' ? 'EMP' : 'BST');
        const userCode = prefix + Math.floor(100000 + Math.random() * 900000);

        const sql = `INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit) VALUES (?, ?, ?, ?, 0.00, 0.00)`;
        db.run(sql, [userCode, username.trim(), password.trim(), role], function(err) {
            if (err) {
                console.error("注册写入失败:", err);
                return res.status(400).json({ error: '账号注册失败，请更换账号名重试' });
            }

            res.json({
                success: true,
                user: { id: this.lastID, user_code: userCode, username: username.trim(), role, balance: 0.00, frozen_deposit: 0.00 }
            });
        });
    });
});

// 获取个人最新信息
app.get('/api/user/:id', (req, res) => {
    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: '用户不存在' });
        res.json(user);
    });
});

// ==================== 2. 订单与交易流程接口 ====================

app.get('/api/orders/list', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取订单列表失败' });
        res.json(rows);
    });
});

app.post('/api/orders/create', (req, res) => {
    const { employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit } = req.body;
    const displayId = 'QW' + Date.now().toString().slice(-8);

    const sql = `INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [displayId, employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit], function(err) {
        if (err) return res.status(500).json({ error: '发布订单失败' });
        res.json({ success: true, orderId: this.lastID });
    });
});

app.post('/api/orders/accept', (req, res) => {
    const { orderId, boosterId } = req.body;
    db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (!order || order.status !== 0) return res.status(400).json({ error: '该订单不可接单' });

        db.get(`SELECT balance FROM users WHERE id = ?`, [boosterId], (err, booster) => {
            if (!booster || booster.balance < order.deposit) {
                return res.status(400).json({ error: `可用余额不足！接此单需扣除保证金 ¥${order.deposit}` });
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

app.post('/api/orders/complete', (req, res) => {
    const { orderId, proofImg } = req.body;
    db.run(`UPDATE orders SET proof_img = ?, status = 2 WHERE id = ?`, [proofImg, orderId], (err) => {
        if (err) return res.status(500).json({ error: '提交失败' });
        res.json({ success: true });
    });
});

app.post('/api/orders/confirm', (req, res) => {
    const { orderId } = req.body;
    db.run(`UPDATE orders SET status = 3 WHERE id = ?`, [orderId], (err) => {
        if (err) return res.status(500).json({ error: '操作失败' });
        res.json({ success: true });
    });
});

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

app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, user_code, username, role, balance, frozen_deposit FROM users ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取失败' });
        res.json(rows);
    });
});

app.post('/api/admin/adjust-balance', (req, res) => {
    const { targetUserId, amount, type } = req.body;
    const adjustVal = type === 'add' ? amount : -amount;
    db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [adjustVal, targetUserId], (err) => {
        if (err) return res.status(500).json({ error: '调账失败' });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log('QW电竞外派后端服务已正常启动，端口: 3000'));
