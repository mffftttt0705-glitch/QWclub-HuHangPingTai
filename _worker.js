// 需要的环境变量(Secret): JWT_SECRET, ADMIN_KEY ；D1 绑定: DB
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? unb64u(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return `pbkdf2$${b64u(salt)}$${b64u(bits)}`;
}
async function verifyPassword(pw, stored) {
  if (stored.startsWith('pbkdf2$')) return safeEq(await hashPassword(pw, stored.split('$')[1]), stored);
  return safeEq(stored, pw); // 兼容旧明文账号，登录成功后自动升级为哈希
}

const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
async function signToken(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}
async function verifyToken(token, secret) {
  try {
    const [body, sig] = (token || '').split('.');
    if (!body || !sig) return null;
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64u(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

const USER_FIELDS = 'id, user_code, username, role, balance, frozen_deposit';
const money = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
const str = (v, max) => String(v ?? '').trim().slice(0, max);

// 签名密钥：优先用环境变量 JWT_SECRET；没设置时自动生成并保存在数据库里，无需手动配置
let cachedSecret;
async function getSecret(env) {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS app_settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run();
  const q = () => env.DB.prepare("SELECT v FROM app_settings WHERE k = 'jwt_secret'").first();
  let row = await q();
  if (!row) {
    await env.DB.prepare("INSERT OR IGNORE INTO app_settings (k, v) VALUES ('jwt_secret', ?)").bind(b64u(crypto.getRandomValues(new Uint8Array(32)))).run();
    row = await q();
  }
  return (cachedSecret = row.v);
}

async function getMe(request, env, secret) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const p = await verifyToken(token, secret);
  if (!p) return null;
  return await env.DB.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).bind(p.uid).first();
}

export default {
  async fetch(request, env) {
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    const err = (m, s = 400) => json({ error: m }, s);
    const { pathname: path } = new URL(request.url);
    const method = request.method;
    // 非 /api 请求交给静态资源(public/index.html)
    if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    if (path === '/api/health') { // 部署自检: 浏览器直接打开 /api/health 查看
      const h = { worker: true, db: !!env.DB, jwt: env.JWT_SECRET ? 'env' : 'auto', adminKey: !!env.ADMIN_KEY, schema: 'ok' };
      if (env.DB) {
        try {
          await env.DB.prepare('SELECT id, user_code, username, password_hash, role, balance, frozen_deposit FROM users LIMIT 1').all();
          await env.DB.prepare('SELECT id, display_id, employer_id, booster_id, title, game_name, game_region, time_limit, description, bounty, deposit, status, proof_img FROM orders LIMIT 1').all();
        } catch (e) { h.schema = String(e.message).slice(0, 200); }
      }
      return json(h);
    }
    if (!env.DB) return err('服务器未绑定 D1 数据库(变量名需为 DB)', 500);
    const secret = await getSecret(env);

    try {
      const b = method === 'POST' ? await request.json().catch(() => ({})) : {};

      // ---------- 公开接口 ----------
      if (path === '/api/login' && method === 'POST') {
        const username = str(b.username, 20), password = str(b.password, 64);
        if (!username || !password) return err('请输入账号名称和密码');
        const row = await env.DB.prepare(`SELECT ${USER_FIELDS}, password_hash FROM users WHERE username = ?`).bind(username).first();
        if (!row || !(await verifyPassword(password, row.password_hash))) return err('账号或密码错误');
        if (!row.password_hash.startsWith('pbkdf2$')) {
          await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), row.id).run();
        }
        const { password_hash, ...user } = row;
        return json({ success: true, user, token: await signToken({ uid: user.id }, secret) });
      }

      if (path === '/api/register' && method === 'POST') {
        const username = str(b.username, 20), password = str(b.password, 64), role = b.role;
        if (!/^[\w\u4e00-\u9fa5]{3,20}$/.test(username)) return err('账号名需为3-20位字母、数字、下划线或中文');
        if (password.length < 6) return err('密码至少6位');
        if (!['employer', 'booster', 'admin'].includes(role)) return err('角色不合法');
        if (role === 'admin') {
          if (env.ADMIN_KEY) { if (!safeEq(String(b.adminKey || ''), env.ADMIN_KEY)) return err('管理员注册授权密钥不正确！'); }
          else if (await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first()) return err('已存在管理员；再注册管理员需要先设置 ADMIN_KEY');
        }
        if (await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()) return err('该账号名称已被注册，请更换名称');

        const prefix = role === 'admin' ? 'ADM' : role === 'employer' ? 'EMP' : 'BST';
        const hash = await hashPassword(password);
        let result, userCode;
        for (let i = 0; i < 3 && !result; i++) { // user_code 冲突时重试
          userCode = prefix + (100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
          try {
            result = await env.DB.prepare('INSERT INTO users (user_code, username, password_hash, role, balance, frozen_deposit) VALUES (?, ?, ?, ?, 0, 0)')
              .bind(userCode, username, hash, role).run();
          } catch (e) { if (i === 2) throw e; }
        }
        const user = { id: result.meta.last_row_id, user_code: userCode, username, role, balance: 0, frozen_deposit: 0 };
        return json({ success: true, user, token: await signToken({ uid: user.id }, secret) });
      }

      const me = await getMe(request, env, secret);

      if (path === '/api/orders/list' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
        // 完工凭证仅订单参与者和管理员可见
        return json((results || []).map((o) => (me && (me.role === 'admin' || me.id === o.employer_id || me.id === o.booster_id)) ? o : { ...o, proof_img: null }));
      }

      // ---------- 以下接口必须登录 ----------
      if (!me) return err('请先登录', 401);

      if (path === '/api/me' && method === 'GET') return json(me);

      // 发布订单：同时托管赏金
      if (path === '/api/orders/create' && method === 'POST') {
        if (me.role !== 'employer') return err('仅派单员可发布需求', 403);
        const title = str(b.title, 60), gameName = str(b.gameName, 30), gameRegion = str(b.gameRegion, 30), timeLimit = str(b.timeLimit, 30), description = str(b.description, 500);
        const bounty = money(b.bounty), deposit = money(b.deposit);
        if (!title || !gameName || !gameRegion || !timeLimit || !description) return err('请完整填写需求信息');
        if (!(bounty > 0 && bounty <= 100000) || !(deposit >= 0 && deposit <= 100000)) return err('金额不合法');

        const hold = await env.DB.prepare('UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ? AND balance >= ?').bind(bounty, bounty, me.id, bounty).run();
        if (!hold.meta.changes) return err(`可用余额不足！发单需托管赏金 ¥${bounty}`);
        try {
          const displayId = 'QW' + Date.now().toString().slice(-8) + (crypto.getRandomValues(new Uint8Array(1))[0] % 100);
          const r = await env.DB.prepare('INSERT INTO orders (display_id, employer_id, title, game_name, game_region, time_limit, description, bounty, deposit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(displayId, me.id, title, gameName, gameRegion, timeLimit, description, bounty, deposit).run();
          return json({ success: true, orderId: r.meta.last_row_id });
        } catch (e) { // 失败则退回托管金
          await env.DB.prepare('UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?').bind(bounty, bounty, me.id).run();
          throw e;
        }
      }

      // 打手接单：先扣保证金，再原子抢单
      if (path === '/api/orders/accept' && method === 'POST') {
        if (me.role !== 'booster') return err('仅打手可接单', 403);
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(b.orderId)).first();
        if (!order || order.status !== 0) return err('该订单状态不可接单');
        const pay = await env.DB.prepare('UPDATE users SET balance = balance - ?, frozen_deposit = frozen_deposit + ? WHERE id = ? AND balance >= ?').bind(order.deposit, order.deposit, me.id, order.deposit).run();
        if (!pay.meta.changes) return err(`可用余额不足！抢此单需扣除保证金 ¥${order.deposit}`);
        const claim = await env.DB.prepare('UPDATE orders SET booster_id = ?, status = 1 WHERE id = ? AND status = 0').bind(me.id, order.id).run();
        if (!claim.meta.changes) {
          await env.DB.prepare('UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?').bind(order.deposit, order.deposit, me.id).run();
          return err('手慢了，该订单已被抢走');
        }
        return json({ success: true });
      }

      // 提交完工凭证：仅该单打手
      if (path === '/api/orders/complete' && method === 'POST') {
        const proof = str(b.proofImg, 500);
        if (!proof) return err('请填写完工说明');
        const r = await env.DB.prepare('UPDATE orders SET proof_img = ?, status = 2 WHERE id = ? AND status = 1 AND booster_id = ?').bind(proof, Number(b.orderId), me.id).run();
        return r.meta.changes ? json({ success: true }) : err('无权操作或订单状态不正确', 403);
      }

      // 验收：仅该单派单员或管理员
      if (path === '/api/orders/confirm' && method === 'POST') {
        const r = me.role === 'admin'
          ? await env.DB.prepare('UPDATE orders SET status = 3 WHERE id = ? AND status = 2').bind(Number(b.orderId)).run()
          : await env.DB.prepare('UPDATE orders SET status = 3 WHERE id = ? AND status = 2 AND employer_id = ?').bind(Number(b.orderId), me.id).run();
        return r.meta.changes ? json({ success: true }) : err('无权操作或订单状态不正确', 403);
      }

      // 结算：仅管理员；先原子改状态防止重复发放
      if (path === '/api/orders/admin-settle' && method === 'POST') {
        if (me.role !== 'admin') return err('仅管理员可结算', 403);
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(b.orderId)).first();
        if (!order || order.status !== 3) return err('订单未处于可结算状态');
        const claim = await env.DB.prepare('UPDATE orders SET status = 4 WHERE id = ? AND status = 3').bind(order.id).run();
        if (!claim.meta.changes) return err('订单已被结算');
        await env.DB.batch([
          env.DB.prepare('UPDATE users SET balance = balance + ?, frozen_deposit = frozen_deposit - ? WHERE id = ?').bind(order.bounty + order.deposit, order.deposit, order.booster_id),
          env.DB.prepare('UPDATE users SET frozen_deposit = frozen_deposit - ? WHERE id = ?').bind(order.bounty, order.employer_id)
        ]);
        return json({ success: true });
      }

      // ---------- 管理员接口 ----------
      if (path.startsWith('/api/admin/')) {
        if (me.role !== 'admin') return err('无管理员权限', 403);

        if (path === '/api/admin/users' && method === 'GET') {
          const { results } = await env.DB.prepare(`SELECT ${USER_FIELDS} FROM users ORDER BY id DESC LIMIT 500`).all();
          return json(results || []);
        }
        if (path === '/api/admin/adjust-balance' && method === 'POST') {
          const amount = money(b.amount);
          if (!(amount > 0 && amount <= 1000000) || !['add', 'reduce'].includes(b.type)) return err('调账参数不合法');
          const uid = Number(b.targetUserId);
          const r = b.type === 'add'
            ? await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(amount, uid).run()
            : await env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?').bind(amount, uid, amount).run();
          return r.meta.changes ? json({ success: true }) : err('用户不存在或余额不足以扣除');
        }
      }

      return err('接口未找到', 404);
    } catch (e) {
      console.error(e);
      return err('服务器响应异常', 500);
    }
  }
};
