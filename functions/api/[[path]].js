const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}
function ok(data = {}, msg = 'success') { return json({ code: 1, msg, data }); }
function fail(msg = '请求失败', status = 200, data = null) { return json({ code: 0, msg, data }, status); }
function now() { return Date.now(); }
function token() { return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); }
function orderNo() { return `M${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`; }
function qs(url) { return Object.fromEntries(url.searchParams.entries()); }
async function body(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) return await request.formData();
  if (ct.includes('application/json')) return await request.json().catch(() => ({}));
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch {}
  return Object.fromEntries(new URLSearchParams(text));
}
function authToken(request) { return request.headers.get('token') || request.headers.get('x-token') || ''; }
async function currentUser(env, request) {
  const t = authToken(request);
  if (!t || !env.DB) return null;
  const row = await env.DB.prepare(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?`).bind(t, now()).first();
  return row || null;
}
function publicUser(u) {
  return { id:u.id, mobile:u.mobile, nickname:u.nickname, avatar:u.avatar, type:u.type, money:u.money, score:u.score, level_id:u.level_id, thug_id:u.type === '2' ? u.id : null };
}
async function requireUser(env, request) {
  const u = await currentUser(env, request);
  if (!u) return { error: fail('请先登录', 401) };
  if (u.status !== 1) return { error: fail('账号已被禁用', 403, { ban_status:1 }) };
  return { user:u };
}
async function setting(env, key, fallback='') {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
  return r?.value ?? fallback;
}
async function listRows(env, sql, params=[]) { return (await env.DB.prepare(sql).bind(...params).all()).results || []; }
function pageParams(q) { return { page:Math.max(1, Number(q.page||1)), limit:Math.min(100, Math.max(1, Number(q.limit||20))) }; }
function paginate(rows, page, limit) { const start=(page-1)*limit; return rows.slice(start,start+limit); }

async function upload(env, request) {
  const form = await body(request);
  const file = form.get('file') || form.get('files');
  if (!(file instanceof File)) return fail('没有收到文件');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary=''; const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
  const b64 = btoa(binary);
  const r = await env.DB.prepare('INSERT INTO media(filename,mime,body_base64) VALUES(?,?,?)').bind(file.name || 'upload', file.type || 'application/octet-stream', b64).run();
  const id = r.meta.last_row_id;
  const url = `/api/common/upload/${id}`;
  return ok({ url, fullurl: new URL(url, request.url).toString() });
}

async function media(env, id) {
  const r = await env.DB.prepare('SELECT mime,body_base64 FROM media WHERE id=?').bind(id).first();
  if (!r) return new Response('Not Found', {status:404});
  const binary = atob(r.body_base64); const out = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i);
  return new Response(out, {headers:{'content-type':r.mime,'cache-control':'public, max-age=31536000'}});
}

async function api(env, request, path) {
  const q = qs(new URL(request.url));
  const method = request.method.toUpperCase();
  const data = method === 'GET' ? q : await body(request);

  if (path === 'common/upload' && method === 'POST') return upload(env, request);
  if (path.startsWith('common/upload/') && method === 'GET') return media(env, path.split('/').pop());

  // Public bootstrap data
  if (path === 'index/configure') return ok({site_name:await setting(env,'site_name','鸡无系统'),site_logo:await setting(env,'site_logo','/static/eon.png'),min_withdraw:Number(await setting(env,'min_withdraw','10')),fee_rate:Number(await setting(env,'fee_rate','0'))});
  if (path === 'index/lunboList') return ok(await listRows(env,'SELECT * FROM banners WHERE status=1 ORDER BY sort ASC,id DESC'));
  if (path === 'goods/categoryList') return ok(await listRows(env,'SELECT * FROM categories WHERE status=1 ORDER BY sort ASC,id ASC'));
  if (path === 'goods/goodsList') {
    const rows=await listRows(env,'SELECT g.*,c.name category_name FROM goods g LEFT JOIN categories c ON c.id=g.category_id WHERE g.status=1 ORDER BY g.sort ASC,g.id DESC');
    const p=pageParams(q); return ok({data:paginate(rows,p.page,p.limit),total:rows.length,current_page:p.page,last_page:Math.max(1,Math.ceil(rows.length/p.limit))});
  }
  if (path === 'goods/goodsMsg') { const r=await env.DB.prepare('SELECT g.*,c.name category_name FROM goods g LEFT JOIN categories c ON c.id=g.category_id WHERE g.id=?').bind(Number(data.id||q.id)).first(); return r?ok(r):fail('商品不存在'); }
  if (path === 'index/noticeList') return ok(await listRows(env,'SELECT * FROM notices WHERE status=1 ORDER BY id DESC'));
  if (path === 'index/noticeMsg') { const r=await env.DB.prepare('SELECT * FROM notices WHERE id=? AND status=1').bind(Number(data.id||q.id)).first(); return r?ok(r):fail('公告不存在'); }
  if (path === 'index/customerServiceList') return ok(await listRows(env,'SELECT id,name,avatar FROM customer_services WHERE status=1 ORDER BY id ASC'));
  if (path === 'user/getLevelList') return ok(await listRows(env,'SELECT * FROM levels ORDER BY score ASC'));
  if (path === 'user/userRanking') return ok(await listRows(env,'SELECT id,nickname,avatar,score FROM users WHERE status=1 ORDER BY score DESC,id ASC LIMIT 50'));
  if (path === 'thug/thugList') return ok(await listRows(env,'SELECT * FROM thugs WHERE status=1 ORDER BY online DESC,score DESC,id DESC'));
  if (path === 'thug/thugRewardList') return ok([]);
  if (path === 'goods/jackpotList') return ok([]);

  // Login / SMS. Production should replace the dev SMS provider.
  if (path === 'sms/send' && method === 'POST') {
    const mobile=String(data.mobile||''); if(!/^1[3-9]\d{9}$/.test(mobile)) return fail('手机号格式错误');
    const code = await setting(env,'sms_dev_code','1234');
    await env.DB.prepare('INSERT INTO sms_codes(mobile,code,event,expires_at) VALUES(?,?,?,?) ON CONFLICT(mobile) DO UPDATE SET code=excluded.code,event=excluded.event,expires_at=excluded.expires_at').bind(mobile,String(code),data.event||'mobilelogin',now()+5*60*1000).run();
    return ok({mobile,expires_in:300}, '验证码已发送（开发模式验证码：'+code+'）');
  }
  if (path === 'user/mobilelogin' && method === 'POST') {
    const mobile=String(data.mobile||''), captcha=String(data.captcha||'');
    const sms=await env.DB.prepare('SELECT * FROM sms_codes WHERE mobile=? AND expires_at>?').bind(mobile,now()).first();
    const dev=await setting(env,'sms_dev_code','1234');
    if (!sms || captcha !== sms.code) { if(captcha!==String(dev)) return fail('验证码错误'); }
    let u=await env.DB.prepare('SELECT * FROM users WHERE mobile=?').bind(mobile).first();
    if(!u){ const r=await env.DB.prepare('INSERT INTO users(mobile,nickname) VALUES(?,?)').bind(mobile,'用户'+mobile.slice(-4)).run(); u=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(r.meta.last_row_id).first(); }
    const t=token(); await env.DB.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').bind(t,u.id,now()+30*24*3600*1000).run();
    return ok({token:t,userinfo:{...publicUser(u),token:t}},'登录成功');
  }

  const guard=await requireUser(env,request); if(guard.error) return guard.error; const u=guard.user;

  if (path === 'user/getUserInfo') return ok(publicUser(u));
  if (path === 'user/userEdit' && method === 'POST') {
    const nickname=data.nickname ?? u.nickname, avatar=data.avatar ?? u.avatar;
    await env.DB.prepare('UPDATE users SET nickname=?,avatar=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(nickname,avatar,u.id).run();
    return ok(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(u.id).first());
  }
  if (path === 'user/balanceLog') return ok(await listRows(env,'SELECT * FROM balance_logs WHERE user_id=? ORDER BY id DESC LIMIT 100',[u.id]));
  if (path === 'user/balanceRecharge' && method === 'POST') {
    const amount=Number(data.money||data.amount||0); if(amount<=0) return fail('充值金额错误');
    // Demo payment: credit immediately. Replace with a real payment provider before production.
    const balance=Number(u.money)+amount;
    await env.DB.prepare('UPDATE users SET money=? WHERE id=?').bind(balance,u.id).run();
    await env.DB.prepare('INSERT INTO balance_logs(user_id,amount,balance,type,remark) VALUES(?,?,?,?,?)').bind(u.id,amount,balance,'recharge','演示充值').run();
    return ok({money:balance,paid:true});
  }
  if (path === 'user/scoreLevel') return ok({score:u.score,level_id:u.level_id});
  if (path === 'user/userShare') return ok({code:String(u.id),url:`${new URL(request.url).origin}/#/pages/login/login?pid=${u.id}`});
  if (path === 'user/levelApply' || path === 'user/levelOrder') return ok({status:1});
  if (path === 'user/userApply' && method === 'POST') return ok({status:1});

  if (path === 'goods/orderAdd' && method === 'POST') {
    const goodsId=Number(data.goods_id||data.id||0), g=await env.DB.prepare('SELECT * FROM goods WHERE id=? AND status=1').bind(goodsId).first();
    if(!g) return fail('商品不存在');
    const no=orderNo(); const price=Number(data.pay_price||data.price||g.price); const r=await env.DB.prepare('INSERT INTO orders(order_no,user_id,goods_id,title,pay_price,status,remark) VALUES(?,?,?,?,?,?,?)').bind(no,u.id,g.id,g.title,price,0,data.remark||'').run();
    return ok({id:r.meta.last_row_id,order_no:no,pay_price:price,status:0});
  }
  if (path === 'goods/orderList') {
    const rows=await listRows(env,`SELECT o.*,g.logo,g.title goods_title FROM orders o LEFT JOIN goods g ON g.id=o.goods_id WHERE o.user_id=? ORDER BY o.id DESC`,[u.id]);
    const p=pageParams(q); return ok({data:paginate(rows,p.page,p.limit),total:rows.length,current_page:p.page,last_page:Math.max(1,Math.ceil(rows.length/p.limit))});
  }
  if (path === 'goods/orderMsg') { const r=await env.DB.prepare('SELECT o.*,g.logo,g.title goods_title FROM orders o LEFT JOIN goods g ON g.id=o.goods_id WHERE o.id=? AND o.user_id=?').bind(Number(data.id||q.id),u.id).first(); return r?ok(r):fail('订单不存在'); }
  if (path === 'goods/orderPay' && method === 'POST') { const id=Number(data.id||0); const r=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').bind(id,u.id).first(); if(!r)return fail('订单不存在'); await env.DB.prepare('UPDATE orders SET status=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run(); return ok({id,status:1,pay_status:1}); }
  if (path === 'goods/orderCancel' && method === 'POST') { await env.DB.prepare('UPDATE orders SET status=8,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(Number(data.id),u.id).run(); return ok({status:8}); }
  if (path === 'goods/orderConfirm' && method === 'POST') { await env.DB.prepare('UPDATE orders SET status=4,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(Number(data.id),u.id).run(); return ok({status:4}); }
  if (path === 'goods/orderComplaint' && method === 'POST') { const r=await env.DB.prepare('INSERT INTO complaints(order_id,user_id,type,content,images) VALUES(?,?,?,?,?)').bind(Number(data.id),u.id,Number(data.type||1),data.content||'',data.images||'').run(); await env.DB.prepare('UPDATE orders SET complaint=1,status=6 WHERE id=? AND user_id=?').bind(Number(data.id),u.id).run(); return ok({id:r.meta.last_row_id}); }
  if (path === 'goods/complaintMsg') return ok(await listRows(env,'SELECT * FROM complaints WHERE user_id=? ORDER BY id DESC',[u.id]));
  if (path === 'goods/orderService') return ok({status:1});
  if (path === 'goods/orderRevoke' && method === 'POST') { await env.DB.prepare('UPDATE orders SET complaint=0,status=7 WHERE id=? AND user_id=?').bind(Number(data.id),u.id).run(); return ok({status:7}); }
  if (path === 'goods/orderSmoke' && method === 'POST') return ok({status:1});
  if (path === 'goods/thugAppoint') return ok([]);

  if (path === 'goods/moneyList') return ok({money:u.money});
  if (path === 'goods/withdrawalList') return ok(await listRows(env,'SELECT * FROM withdrawals WHERE user_id=? ORDER BY id DESC',[u.id]));
  if (path === 'thug/bond' && method === 'POST') return ok({status:1});
  if (path === 'thug/thugAdd' && method === 'POST') { const r=await env.DB.prepare('INSERT INTO thugs(user_id,nickname,avatar,title,description,price) VALUES(?,?,?,?,?,?)').bind(u.id,data.nickname||u.nickname,data.avatar||u.avatar,data.title||'',data.description||'',Number(data.price||0)).run(); return ok({id:r.meta.last_row_id}); }
  if (path === 'thug/thugEdit' && method === 'POST') { await env.DB.prepare('UPDATE thugs SET nickname=?,avatar=?,title=?,description=?,price=? WHERE id=? AND user_id=?').bind(data.nickname||'',data.avatar||'',data.title||'',data.description||'',Number(data.price||0),Number(data.id),u.id).run(); return ok({status:1}); }
  if (path === 'thug/thugApply' && method === 'POST') return ok({status:1});
  if (path === 'thug/receivingOrders' || path === 'thug/orderList' || path === 'thug/thugStream') return ok([]);
  if (path === 'thug/orderConnect' || path === 'thug/orderStart' || path === 'thug/orderFinish' || path === 'thug/orderCancel') return ok({status:1});
  if (path === 'thug/thugMsg') return ok({});

  if (path === 'fine/fineList') return ok([]);
  if (path === 'fine/finePay' && method === 'POST') return ok({status:1});
  if (path === 'common/wechat' && method === 'POST') return ok({status:1});
  if (path === 'im/getToken') return ok({token:token(),user_id:u.id});
  if (path === 'im/createConversation' && method === 'POST') { const target=Number(data.user_id||data.target_user_id||0); await env.DB.prepare('INSERT OR IGNORE INTO conversations(user_id,target_user_id) VALUES(?,?)').bind(u.id,target).run(); return ok({id:target,user_id:u.id,target_user_id:target}); }

  // Compatibility for legacy screens whose exact server-side implementation was not included in the frontend package.
  return ok(Array.isArray(data) ? [] : {});
}

export async function onRequest(context) {
  const {request, env, params} = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '').replace(/^\//,'');
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'Content-Type, token, X-Token'}});
  if (!env.DB) return fail('D1 数据库未绑定：请在 Cloudflare Pages 绑定 DB',500);
  try { return await api(env,request,path); }
  catch (e) { console.error(e); return fail('服务器内部错误：'+(e?.message||e),500); }
}
