const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./qw_esports.db');

// ================= 1. 用户认证与基础逻辑 =================

// 用户注册 (初始可用余额严格为 0)
app.post('/api/register', (req, res) => {
    const { username, password, role } = req.body;
    const userCode = (role === 'admin' ? 'ADM' : role === 'employer' ? 'EMP' : 'BST') + Math.floor(100000 + Math.random() * 900000);
    
    // 假设简易密码处理，建议使用 bcrypt.hashSync(password, 10)
    const sql = `INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit) VALUES (?, ?, ?, ?, 0.00, 0.00)`;
    db.run(sql, [userCode, username, password, role], function(err) {
        if (err) return res.status(400).json({ error: '用户名已存在或注册失败' });
        res.json({ success: true, userId: this.lastID, userCode, username, role, balance: 0.00 });
    });
});

// 获取用户最新资产与信息
app.get('/api/user/:id', (req, res) => {
    db.get(`SELECT id, user_code, username, role, balance, frozen_deposit FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: '用户不存在' });
        res.json(user);
    });
});

// ================= 2. 核心代练订单业务流 =================

// 发布订单 (扣除派单员托管赏金)
app.post('/api/orders/create', (req, res) => {
    const { employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit } = req.body;

    db.get(`SELECT balance FROM users WHERE id = ?`, [employerId], (err, user) => {
        if (!user || user.balance < bounty) {
            return res.status(400).json({ error: '账户余额不足以托管赏金，请联系管理员充值' });
        }

        db.serialize(() => {
            // 扣除发单者余额
            db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [bounty, employerId]);
            
            // 写入订单
            const displayId = 'QW' + Math.floor(100000 + Math.random() * 900000);
            const sql = `INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
            db.run(sql, [displayId, employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit], function(err) {
                if (err) return res.status(500).json({ error: '发布订单失败' });
                res.json({ success: true, orderId: this.lastID, displayId });
            });
        });
    });
});

// 打手接单 (扣除保证金并冻结)
app.post('/api/orders/accept', (req, res) => {
    const { orderId, boosterId } = req.body;

    db.get(`SELECT * FROM orders WHERE id = ? AND status = 0`, [orderId], (err, order) => {
        if (!order) return res.status(400).json({ error: '订单不存在或已被抢单' });

        db.get(`SELECT balance FROM users WHERE id = ?`, [boosterId], (err, booster) => {
            if (!booster || booster.balance < order.deposit) {
                return res.status(400).json({ error: '保证金不足，接单失败' });
            }

            db.serialize(() => {
                // 扣除余额并增加冻结保证金
                db.run(`UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ?`, [order.deposit, order.deposit, boosterId]);
                // 更新订单状态为代练中 (status=1)
                db.run(`UPDATE orders SET booster_id = ?, status = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [boosterId, orderId]);
                res.json({ success: true, message: '抢单成功！保证金已冻结' });
            });
        });
    });
});

// 打手提交完工服务
app.post('/api/orders/complete', (req, res) => {
    const { orderId, proofImg } = req.body;
    db.run(`UPDATE orders SET proof_img = ?, status = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 1`, [proofImg, orderId], function(err) {
        if (this.changes === 0) return res.status(400).json({ error: '提交失败，订单状态不符' });
        res.json({ success: true, message: '已提交完工凭证，等待验收' });
    });
});

// 派单员确认验收
app.post('/api/orders/confirm', (req, res) => {
    const { orderId, employerId } = req.body;
    db.run(`UPDATE orders SET status = 3, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND employer_id = ? AND status = 2`, [orderId, employerId], function(err) {
        if (this.changes === 0) return res.status(400).json({ error: '确认失败' });
        res.json({ success: true, message: '已验收确认，等待管理员打款结算' });
    });
});

// 管理员最终结算资金 (解冻退保证金 + 发放赏金)
app.post('/api/orders/admin-settle', (req, res) => {
    const { orderId, adminId } = req.body;

    // 验证管理员身份
    db.get(`SELECT role FROM users WHERE id = ?`, [adminId], (err, admin) => {
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: '无权限操作' });

        db.get(`SELECT * FROM orders WHERE id = ? AND status = 3`, [orderId], (err, order) => {
            if (!order) return res.status(400).json({ error: '订单不处于待结算状态' });

            db.serialize(() => {
                // 退还保证金并加上赏金给打手
                db.run(`UPDATE users SET frozen_deposit = frozen_deposit - ?, balance = balance + ? + ? WHERE id = ?`, 
                       [order.deposit, order.deposit, order.bounty, order.booster_id]);
                // 更新订单状态为已完成结算 (status=4)
                db.run(`UPDATE orders SET status = 4, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [orderId]);
                res.json({ success: true, message: '管理员结算成功！资金已打入打手账户' });
            });
        });
    });
});

// ================= 3. 管理员控制台与账户调账 API =================

// 获取所有用户列表 (管理员专享)
app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, user_code, username, role, balance, frozen_deposit, created_at FROM users`, [], (err, rows) => {
        res.json(rows || []);
    });
});

// 管理员增减用户余额 (加钱/扣钱)
app.post('/api/admin/adjust-balance', (req, res) => {
    const { adminId, targetUserId, amount, type } = req.body; // type: 'add' 或 'reduce'

    db.get(`SELECT role FROM users WHERE id = ?`, [adminId], (err, admin) => {
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: '仅管理员可进行人工调账' });

        const adjustAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);
        db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [adjustAmount, targetUserId], function(err) {
            if (err) return res.status(500).json({ error: '调账失败' });
            res.json({ success: true, message: `余额调整成功！` });
        });
    });
});

// 管理员编辑或删除任意订单
app.delete('/api/admin/order/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id], function(err) {
        res.json({ success: true, message: '订单已删除' });
    });
});

app.listen(3000, () => {
    console.log('QW电竞外派后端服务已成功启动，监听端口 3000');
});
