export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. 用户登录接口
      if (path === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        if (!username || !password) {
          return new Response(JSON.stringify({ error: '请输入账号名称和密码' }), { status: 400, headers: corsHeaders });
        }

        const user = await env.DB.prepare(
          'SELECT id, user_code, username, role, balance, frozen_deposit, password_hash FROM users WHERE username = ?'
        ).bind(username.trim()).first();

        if (!user) {
          return new Response(JSON.stringify({ error: '账号不存在，请检查或先注册账号' }), { status: 400, headers: corsHeaders });
        }
        if (user.password_hash !== password.trim()) {
          return new Response(JSON.stringify({ error: '密码错误，请重新输入' }), { status: 400, headers: corsHeaders });
        }

        const { password_hash, ...userInfo } = user;
        return new Response(JSON.stringify({ success: true, user: userInfo }), { headers: corsHeaders });
      }

      // 2. 用户注册接口
      if (path === '/api/register' && request.method === 'POST') {
        const { username, password, role, adminKey } = await request.json();
        if (!username || !password || !role) {
          return new Response(JSON.stringify({ error: '请完整填写注册信息' }), { status: 400, headers: corsHeaders });
        }

        if (role === 'admin' && adminKey !== 'admin888') {
          return new Response(JSON.stringify({ error: '管理员注册授权密钥不正确！' }), { status: 400, headers: corsHeaders });
        }

        const existingUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username.trim()).first();
        if (existingUser) {
          return new Response(JSON.stringify({ error: '该账号名称已被注册，请更换名称' }), { status: 400, headers: corsHeaders });
        }

        const prefix = role === 'admin' ? 'ADM' : (role === 'employer' ? 'EMP' : 'BST');
        const userCode = prefix + Math.floor(100000 + Math.random() * 900000);

        const result = await env.DB.prepare(
          'INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit) VALUES (?, ?, ?, ?, 0.00, 0.00)'
        ).bind(userCode, username.trim(), password.trim(), role).run();

        return new Response(JSON.stringify({
          success: true,
          user: { id: result.meta.last_row_id, user_code: userCode, username: username.trim(), role, balance: 0.00, frozen_deposit: 0.00 }
        }), { headers: corsHeaders });
      }

      // 3. 获取用户最新状态
      if (path.startsWith('/api/user/') && request.method === 'GET') {
        const userId = path.split('/')[3];
        const user = await env.DB.prepare(
          'SELECT id, user_code, username, role, balance, frozen_deposit FROM users WHERE id = ?'
        ).bind(userId).first();

        if (!user) return new Response(JSON.stringify({ error: '未找到该用户' }), { status: 404, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: corsHeaders });
      }

      // 4. 获取订单列表
      if (path === '/api/orders/list' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
        return new Response(JSON.stringify(results || []), { headers: corsHeaders });
      }

      // 5. 发布需求订单
      if (path === '/api/orders/create' && request.method === 'POST') {
        const { employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit } = await request.json();
        const displayId = 'QW' + Date.now().toString().slice(-8);

        const result = await env.DB.prepare(
          'INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(displayId, employerId, title, gameName, gameRegion, timeLimit, description, bounty, deposit).run();

        return new Response(JSON.stringify({ success: true, orderId: result.meta.last_row_id }), { headers: corsHeaders });
      }

      // 6. 打手抢单
      if (path === '/api/orders/accept' && request.method === 'POST') {
        const { orderId, boosterId } = await request.json();

        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (!order || order.status !== 0) {
          return new Response(JSON.stringify({ error: '该订单状态不可接单' }), { status: 400, headers: corsHeaders });
        }

        const booster = await env.DB.prepare('SELECT balance FROM users WHERE id = ?').bind(boosterId).first();
        if (!booster || booster.balance < order.deposit) {
          return new Response(JSON.stringify({ error: `可用余额不足！抢此单需扣除保证金 ¥${order.deposit}` }), { status: 400, headers: corsHeaders });
        }

        // 事务或批处理更新余额与订单状态
        await env.DB.batch([
          env.DB.prepare('UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ?').bind(order.deposit, order.deposit, boosterId),
          env.DB.prepare('UPDATE orders SET booster_id = ?, status = 1 WHERE id = ?').bind(boosterId, orderId)
        ]);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 7. 提交完工凭证
      if (path === '/api/orders/complete' && request.method === 'POST') {
        const { orderId, proofImg } = await request.json();
        await env.DB.prepare('UPDATE orders SET proof_img = ?, status = 2 WHERE id = ?').bind(proofImg, orderId).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 8. 派单员验收
      if (path === '/api/orders/confirm' && request.method === 'POST') {
        const { orderId } = await request.json();
        await env.DB.prepare('UPDATE orders SET status = 3 WHERE id = ?').bind(orderId).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 9. 管理员打款结算
      if (path === '/api/orders/admin-settle' && request.method === 'POST') {
        const { orderId } = await request.json();
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (!order || order.status !== 3) {
          return new Response(JSON.stringify({ error: '订单未处于可结算状态' }), { status: 400, headers: corsHeaders });
        }

        const totalPay = order.bounty + order.deposit;
        await env.DB.batch([
          env.DB.prepare('UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?').bind(totalPay, order.deposit, order.booster_id),
          env.DB.prepare('UPDATE orders SET status = 4 WHERE id = ?').bind(orderId)
        ]);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 10. 管理员获取用户列表与调账
      if (path === '/api/admin/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, user_code, username, role, balance, frozen_deposit FROM users ORDER BY id DESC').all();
        return new Response(JSON.stringify(results || []), { headers: corsHeaders });
      }

      if (path === '/api/admin/adjust-balance' && request.method === 'POST') {
        const { targetUserId, amount, type } = await request.json();
        const adjustVal = type === 'add' ? amount : -amount;
        await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(adjustVal, targetUserId).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: '接口未找到' }), { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: '服务器响应异常: ' + err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
