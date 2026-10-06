// QW电竞外派 - 单文件版(页面+后端)，粘贴到 Cloudflare Worker 编辑器即可
const HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>QW电竞外派 - 专业代练外派担保平台</title>\n<script>\n// 仅样式依赖 Tailwind CDN；即使加载失败，页面功能也不受影响\n(function(){var u=['https://cdn.tailwindcss.com','https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'],i=0;(function n(){if(i>=u.length)return;var s=document.createElement('script');s.src=u[i++];s.onerror=function(){s.remove();n()};document.head.appendChild(s)})()})();\n</script>\n<style>body{margin:0;background:#f1f5f9;-webkit-tap-highlight-color:transparent}#app{max-width:28rem;margin:0 auto;background:#fff;min-height:100vh}button{cursor:pointer}input,select,textarea{box-sizing:border-box}</style>\n</head>\n<body class=\"bg-slate-100 text-slate-800 min-h-screen pb-20\">\n<div id=\"app\" class=\"max-w-md mx-auto relative min-h-screen bg-white shadow-xl border-x border-slate-200\"><div style=\"padding:24px;text-align:center;font-size:14px\">页面加载中…</div></div>\n<script>\nconst $ = s => document.querySelector(s), app = $('#app');\nconst esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst num = v => Number(v || 0).toFixed(2);\nconst RT = {employer:'派单员', booster:'打手', admin:'管理员'};\nconst ST = ['待接单','代练中','待验收','待结算','已完成'];\nconst SC = ['bg-amber-100 text-amber-700','bg-blue-100 text-blue-700','bg-indigo-100 text-indigo-700','bg-purple-100 text-purple-700','bg-emerald-100 text-emerald-700'];\nconst GAMES = [['王者荣耀','极速上分'],['英雄联盟','端游竞技'],['三角洲行动','热门战术'],['和平精英','吃鸡代练']];\nconst I = 'w-full bg-slate-50 border rounded-lg p-2.5 mt-1 outline-none font-bold text-xs';\nconst B = 'w-full text-white font-black py-2 rounded-xl text-xs ';\n// 代码绘制的 SVG 图标（线条风格，颜色跟随文字）\nconst P = {\n  shield: '<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>',\n  refresh: '<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>',\n  gamepad: '<path d=\"M6 11h4M8 9v4M15 12h.01M18 10h.01\"/><path d=\"M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.42.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z\"/>',\n  swords: '<path d=\"m14.5 17.5-11.5-11.5V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2\"/><path d=\"m14.5 6.5 3.5-3.5h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2\"/>',\n  user: '<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>',\n  check: '<path d=\"M20 6 9 17l-5-5\"/>',\n  x: '<path d=\"M18 6 6 18M6 6l12 12\"/>'\n};\nconst ic = (n, px) => `<svg width=\"${px || 16}\" height=\"${px || 16}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"flex:none;vertical-align:-0.15em\">${P[n]}</svg>`;\nlet token = ''; try { token = localStorage.getItem('qw_token') || ''; } catch (e) {}\nconst S = { tab:'publish', kw:'', st:'', user:null, users:[], orders:[], modal:'', mode:'login', sel:null, target:null, adjType:'add', proof:'', amt:100,\n  a:{username:'', password:'', role:'employer', adminKey:''},\n  f:{title:'', gameName:'王者荣耀', gameRegion:'安卓微信', timeLimit:'24小时完工', description:'', bounty:100, deposit:200} };\n\nfunction toast(msg, err) {\n  const d = document.createElement('div');\n  d.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold border ' + (err ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-700');\n  d.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99;padding:10px 16px;border-radius:12px;color:#fff;font-size:12px;background:' + (err ? '#ef4444' : '#059669');\n  d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2500);\n}\nfunction setToken(t) { token = t; try { t ? localStorage.setItem('qw_token', t) : localStorage.removeItem('qw_token'); } catch (e) {} }\nasync function diagnose() {\n  try {\n    const h = await (await fetch('/api/health')).json();\n    if (!h.db) return '后端未绑定 D1 数据库（绑定变量名必须是 DB）';\n    if (!h.jwt) return '后端未设置密钥 JWT_SECRET';\n    if (h.schema !== 'ok') return '数据库表结构有问题：' + h.schema + '（请执行 schema.sql）';\n  } catch (e) { return '无法连接后端接口 /api，请确认后端 Worker 与页面部署在同一个域名下'; }\n  return '';\n}\nasync function api(method, path, body) {\n  let r;\n  try { r = await fetch('/api' + path, { method, headers: Object.assign({'Content-Type':'application/json'}, token ? {Authorization:'Bearer ' + token} : {}), body: body ? JSON.stringify(body) : undefined }); }\n  catch (e) { throw new Error('网络连接失败，请检查网络后重试'); }\n  const d = await r.json().catch(() => ({}));\n  if (r.status === 401 && token) { setToken(''); S.user = null; render(); }\n  if (!r.ok) {\n    if (r.status >= 500 || !d.error) throw new Error((await diagnose()) || d.error || '请求失败(状态码 ' + r.status + ')');\n    throw new Error(d.error);\n  }\n  return d;\n}\nconst loadOrders = async () => { try { S.orders = await api('GET', '/orders/list'); } catch (e) {} };\nconst loadUsers = async () => { try { S.users = await api('GET', '/admin/users'); } catch (e) {} };\nconst refreshMe = async () => { if (!token) return; try { S.user = await api('GET', '/me'); } catch (e) {} };\n\nfunction orderCard(o) {\n  const u = S.user, id = u && u.id; let b = '';\n  if (o.status === 0 && u && u.role === 'booster') b = `<button data-act=\"accept\" data-id=\"${o.id}\" class=\"${B}bg-emerald-500\">1. 立即接单 (扣保证金 ¥${o.deposit})</button>`;\n  else if (o.status === 1 && u && id === o.booster_id) b = `<button data-act=\"openProof\" data-id=\"${o.id}\" class=\"${B}bg-blue-600\">2. 提交完工凭证</button>`;\n  else if (o.status === 2 && u && (id === o.employer_id || u.role === 'admin')) b = `<button data-act=\"confirm\" data-id=\"${o.id}\" class=\"${B}bg-amber-500\">3. 派单员验收通过 (提交管理员打款)</button>`;\n  else if (o.status === 3 && u && u.role === 'admin') b = `<button data-act=\"settle\" data-id=\"${o.id}\" class=\"${B}bg-purple-600\">4. 管理员一键打款结算 (退保证金+发放赏金)</button>`;\n  else if (o.status === 4) b = `<div class=\"text-[10px] text-center text-emerald-600 font-bold py-1\">${ic('check', 12)} 该订单已全部结算完毕</div>`;\n  return `<div class=\"bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2\" style=\"margin-bottom:12px\">\n    <div class=\"flex justify-between items-start\"><span class=\"text-xs text-slate-400 font-mono\">单号: ${esc(o.display_id)}</span><span class=\"text-[10px] font-bold px-2 py-0.5 rounded-full ${SC[o.status] || ''}\">${ST[o.status] || '未知'}</span></div>\n    <h4 class=\"font-bold text-sm text-slate-800\">${esc(o.title)}</h4>\n    <div class=\"text-[11px] text-slate-500 flex gap-1.5 flex-wrap\"><span class=\"bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded\">${esc(o.game_name)}</span><span class=\"bg-slate-100 px-2 py-0.5 rounded\">${esc(o.game_region)}</span><span class=\"bg-amber-50 text-amber-700 px-2 py-0.5 rounded\">限时: ${esc(o.time_limit)}</span></div>\n    <div class=\"bg-slate-50 p-2 rounded-xl text-xs text-slate-600 whitespace-pre-wrap\">${esc(o.description || '无特殊要求')}</div>\n    ${o.proof_img ? `<div class=\"bg-emerald-50 p-2 rounded-lg text-xs text-emerald-800 border border-emerald-100 font-medium\">完工凭证: ${esc(o.proof_img)}</div>` : ''}\n    <div class=\"grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-center\"><div><div class=\"text-[10px] text-slate-400\">派单赏金</div><div class=\"text-red-500 font-black text-sm\">¥ ${o.bounty}</div></div><div><div class=\"text-[10px] text-slate-400\">打手保证金</div><div class=\"text-orange-500 font-black text-sm\">¥ ${o.deposit}</div></div></div>\n    <div class=\"pt-1\">${b}</div></div>`;\n}\nfunction listHtml() {\n  const kw = S.kw.trim().toLowerCase();\n  const l = S.orders.filter(o => (S.st === '' || o.status === S.st) && (!kw || String(o.title).toLowerCase().includes(kw) || String(o.game_name).toLowerCase().includes(kw)));\n  return l.length ? l.map(orderCard).join('') : '<div class=\"text-center py-8 text-slate-400 text-xs\">暂无符合条件的订单</div>';\n}\nconst renderList = () => { const el = $('#list'); if (el) el.innerHTML = listHtml(); };\nconst inp = (m, v, ph, cls, type, n) => `<input data-m=\"${m}\" ${n ? 'data-n=\"1\"' : ''} type=\"${type || 'text'}\" value=\"${esc(v)}\" placeholder=\"${ph}\" class=\"${cls || I}\">`;\nconst modal = (t, b) => `<div class=\"fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4\" style=\"position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px\"><div class=\"bg-white w-full max-w-sm rounded-2xl p-5 space-y-3 shadow-2xl\" style=\"background:#fff;width:100%;max-width:24rem;border-radius:16px;padding:20px\"><div class=\"flex justify-between items-center border-b pb-2\">${t}<button data-act=\"close\" class=\"text-slate-400\">${ic('x', 18)}</button></div>${b}</div></div>`;\n\nfunction modalHtml() {\n  const a = S.a, f = S.f, BT = 'w-full bg-blue-600 text-white font-black py-2.5 rounded-xl shadow mt-2 text-xs';\n  if (S.modal === 'auth') return modal(`<div class=\"flex gap-4 font-black text-sm\"><button data-act=\"mode\" data-v=\"login\" class=\"${S.mode === 'login' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-400'}\">账号登录</button><button data-act=\"mode\" data-v=\"register\" class=\"${S.mode === 'register' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-400'}\">注册新账号</button></div>`,\n    `<div class=\"space-y-3 text-xs\"><div><label class=\"text-slate-500 font-medium\">账号名称</label>${inp('a.username', a.username, '输入账号名称')}</div><div><label class=\"text-slate-500 font-medium\">密码</label>${inp('a.password', a.password, '输入密码', I, 'password')}</div>` +\n    (S.mode === 'register' ? `<div><label class=\"text-slate-500 font-medium\">选择账号身份角色</label><select data-m=\"a.role\" class=\"${I}\">${Object.keys(RT).map(k => `<option value=\"${k}\" ${a.role === k ? 'selected' : ''}>${RT[k]}</option>`).join('')}</select></div>` +\n      (a.role === 'admin' ? `<div class=\"p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800\">* 管理员授权密钥：${inp('a.adminKey', a.adminKey, '输入管理员授权密钥', I, 'password')}</div>` : '') : '') +\n    `<button data-act=\"${S.mode}\" class=\"${BT}\">${S.mode === 'login' ? '立即登录' : '确认注册'}</button></div>`);\n  if (S.modal === 'publish') return modal('<h3 class=\"font-black text-sm\">发布代练需求</h3>',\n    `<div class=\"space-y-2 text-xs\">${inp('f.title', f.title, '代练需求标题')}<div class=\"grid grid-cols-2 gap-2\">${inp('f.gameName', f.gameName, '游戏名称')}${inp('f.gameRegion', f.gameRegion, '游戏区服')}</div>${inp('f.timeLimit', f.timeLimit, '代练时限')}<textarea data-m=\"f.description\" rows=\"2\" placeholder=\"详细需求描述...\" class=\"${I}\">${esc(f.description)}</textarea><div class=\"grid grid-cols-2 gap-2\">${inp('f.bounty', f.bounty, '托管赏金(元)', I, 'number', 1)}${inp('f.deposit', f.deposit, '打手保证金(元)', I, 'number', 1)}</div><div class=\"text-[10px] text-slate-400\">发布时将从可用余额中托管赏金</div><button data-act=\"create\" class=\"${BT}\">发布并上架</button></div>`);\n  if (S.modal === 'proof') return modal('<h3 class=\"font-black text-sm\">提交完工凭证</h3>', `<div class=\"space-y-3 text-xs\"><label class=\"text-slate-500 font-medium\">完工说明 / 战绩截图说明</label><textarea data-m=\"proof\" rows=\"3\" placeholder=\"填写完工信息...\" class=\"${I}\">${esc(S.proof)}</textarea><button data-act=\"submitProof\" class=\"${BT}\">确认提交</button></div>`);\n  if (S.modal === 'adjust') return modal('<h3 class=\"font-black text-sm\">用户余额调账</h3>', `<div class=\"space-y-3 text-xs\"><div class=\"bg-purple-50 p-2.5 rounded-xl text-purple-900 border border-purple-100\">目标账号：<b>${esc(S.target && S.target.username)}</b><br>当前余额：<b class=\"text-red-500\">¥${num(S.target && S.target.balance)}</b></div><label class=\"text-slate-500 font-medium\">${S.adjType === 'add' ? '增加金额 (元)' : '扣除金额 (元)'}</label>${inp('amt', S.amt, '金额', I, 'number', 1)}<button data-act=\"adjust\" class=\"${BT}\">确认调账</button></div>`);\n  return '';\n}\n\nfunction render() {\n  const u = S.user; let body = '';\n  if (S.tab === 'publish') body = `<div class=\"p-4 space-y-4\"><div class=\"bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-lg\"><div class=\"flex justify-between items-center mb-3\"><div><h3 class=\"font-extrabold text-sm flex items-center gap-1.5\">${ic('shield', 16)}<span>平台托管代练 · 安全担保</span></h3><p class=\"text-[11px] text-blue-100 mt-0.5\">资金托管担保 极速匹配优质打手</p></div><button data-act=\"openPublish\" class=\"bg-amber-400 text-slate-900 font-black text-xs px-3 py-1 rounded-full shadow\">发布需求</button></div><div class=\"grid grid-cols-2 gap-2\">${GAMES.map(g => `<div data-act=\"openPublish\" data-g=\"${g[0]}\" class=\"bg-white/15 p-3 rounded-xl border border-white/20 flex justify-between items-center cursor-pointer\"><div><div class=\"font-black text-xs text-white\">${g[0]}</div><div class=\"text-[9px] text-blue-100 mt-0.5\">${g[1]}</div></div><span class=\"bg-amber-400 text-slate-900 font-black text-[9px] px-2 py-0.5 rounded-full\">发单</span></div>`).join('')}</div></div></div>`;\n  else if (S.tab === 'hall') body = `<div class=\"p-4 space-y-3\"><div class=\"flex gap-2 items-center\">${inp('kw', S.kw, '搜索游戏 / 标题 / 需求', 'flex-1 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 text-xs outline-none')}<button data-act=\"refresh\" class=\"bg-slate-100 p-2 rounded-full text-slate-600\">${ic('refresh', 14)}</button></div><div class=\"flex justify-between bg-slate-100 p-1 rounded-xl text-xs\">${[['', '全部']].concat(ST.map((t, i) => [i, t])).map(([v, l]) => `<button data-act=\"st\" data-v=\"${v}\" class=\"flex-1 py-1 rounded-lg font-bold text-center ${S.st === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}\">${l}</button>`).join('')}</div><div id=\"list\" class=\"space-y-3\">${listHtml()}</div></div>`;\n  else body = `<div class=\"p-4 space-y-4\"><div class=\"bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-white shadow-xl flex justify-between items-center\"><div><h3 class=\"font-black text-sm\">${u ? esc(u.username) + ` <span class=\"text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30\">${RT[u.role]}</span>` : '游客未登录'}</h3><p class=\"text-[10px] text-slate-400 font-mono mt-0.5\">账号编号: ${u ? esc(u.user_code) : '-'}</p></div>${u ? '' : '<button data-act=\"openAuth\" data-v=\"login\" class=\"text-xs bg-blue-600 px-3 py-1.5 rounded-full font-bold\">登录 / 注册</button>'}</div>\n    <div class=\"bg-white p-4 rounded-2xl border border-slate-200 shadow-sm\"><span class=\"font-extrabold text-xs\">个人资产中心</span><div class=\"grid grid-cols-2 gap-2 text-center bg-slate-50 p-3 rounded-xl border mt-2\"><div><div class=\"text-[10px] text-slate-400\">可用余额</div><div class=\"text-red-500 font-black text-lg\">¥ ${num(u && u.balance)}</div></div><div><div class=\"text-[10px] text-slate-400\">冻结金额(保证金/托管赏金)</div><div class=\"text-orange-500 font-black text-lg\">¥ ${num(u && u.frozen_deposit)}</div></div></div></div>\n    ${u && u.role === 'admin' ? `<div class=\"bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-3\"><div class=\"flex justify-between items-center border-b border-purple-200 pb-2\"><h3 class=\"font-black text-xs text-purple-900\">管理员控制台</h3><button data-act=\"loadUsers\" class=\"text-[10px] text-purple-600 underline font-bold\">刷新用户列表</button></div><div class=\"space-y-1.5\" style=\"max-height:12rem;overflow-y:auto\">${S.users.map(x => `<div class=\"flex justify-between items-center bg-white p-2 rounded-lg border text-xs\"><div><span class=\"font-bold\">${esc(x.username)}</span><span class=\"text-[10px] text-slate-400 ml-1\">(${RT[x.role]})</span><div class=\"text-[10px] text-red-500 font-bold\">余额: ¥${num(x.balance)}</div></div><div class=\"flex gap-1\"><button data-act=\"openAdjust\" data-id=\"${x.id}\" data-t=\"add\" class=\"text-emerald-600 text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold\">+ 加余额</button><button data-act=\"openAdjust\" data-id=\"${x.id}\" data-t=\"reduce\" class=\"text-red-600 text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold\">- 扣余额</button></div></div>`).join('')}</div></div>` : ''}</div>`;\n  const nav = [['publish', 'gamepad', '发单'], ['hall', 'swords', '接单大厅'], ['mine', 'user', '我的']].map(([k, n, l]) => `<button data-act=\"tab\" data-v=\"${k}\" class=\"flex flex-col items-center gap-1 ${S.tab === k ? 'text-blue-600 font-black' : 'text-slate-400'}\">${ic(n, 22)}<span class=\"text-[10px]\">${l}</span></button>`).join('');\n  app.innerHTML = `<div class=\"p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-30\"><div><h1 class=\"text-2xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent\">QW电竞外派</h1><p class=\"text-[10px] text-slate-400 font-medium\">专业电竞代练外派担保服务</p></div>${u ? '<button data-act=\"logout\" class=\"bg-slate-100 text-slate-600 font-bold text-xs px-3 py-1.5 rounded-full border\">退出登录</button>' : '<button data-act=\"openAuth\" data-v=\"login\" class=\"bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow\">登录 / 注册</button>'}</div>${body}${modalHtml()}\n    <nav class=\"fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t grid grid-cols-3 py-2 z-40 text-center\" style=\"position:fixed;bottom:0;left:0;right:0;max-width:28rem;margin:0 auto;background:#fff;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(3,1fr);padding:8px 0;z-index:40\">${nav}</nav>`;\n}\n\nasync function onAuth(r, msg) { setToken(r.token); S.user = r.user; S.modal = ''; S.a.password = ''; toast(msg); if (r.user.role === 'admin') await loadUsers(); render(); }\nconst A = {\n  async tab(d) { S.tab = d.v; if (d.v === 'hall') await loadOrders(); if (d.v === 'mine' && S.user && S.user.role === 'admin') await loadUsers(); render(); },\n  openAuth(d) { S.mode = d.v || 'login'; S.modal = 'auth'; render(); },\n  mode(d) { S.mode = d.v; render(); },\n  close() { S.modal = ''; render(); },\n  async login() { await onAuth(await api('POST', '/login', { username: S.a.username, password: S.a.password }), '登录成功'); },\n  async register() { await onAuth(await api('POST', '/register', S.a), '注册成功'); },\n  logout() { setToken(''); S.user = null; S.users = []; toast('已退出账号登录'); render(); },\n  openPublish(d) { if (!S.user) return toast('请先登录或注册账号！', 1); if (d.g) { S.f.gameName = d.g; S.f.title = d.g + ' 段位提升需求订单'; } S.modal = 'publish'; render(); },\n  async create() { await api('POST', '/orders/create', S.f); toast('需求发布成功！赏金已托管'); S.modal = ''; S.tab = 'hall'; await refreshMe(); await loadOrders(); render(); },\n  async accept(d) { await api('POST', '/orders/accept', { orderId: +d.id }); toast('接单成功！已扣除保证金'); await refreshMe(); await loadOrders(); render(); },\n  openProof(d) { S.sel = +d.id; S.proof = ''; S.modal = 'proof'; render(); },\n  async submitProof() { if (!S.proof.trim()) return toast('请填写完工说明', 1); await api('POST', '/orders/complete', { orderId: S.sel, proofImg: S.proof }); toast('完工凭证提交成功！'); S.modal = ''; await loadOrders(); render(); },\n  async confirm(d) { await api('POST', '/orders/confirm', { orderId: +d.id }); toast('已确认验收！已提交管理员打款'); await loadOrders(); render(); },\n  async settle(d) { await api('POST', '/orders/admin-settle', { orderId: +d.id }); toast('结算成功！已发放赏金并退还保证金'); await refreshMe(); await loadOrders(); render(); },\n  async refresh() { await loadOrders(); renderList(); },\n  st(d) { S.st = d.v === '' ? '' : +d.v; render(); },\n  async loadUsers() { await loadUsers(); render(); },\n  openAdjust(d) { S.target = S.users.find(x => x.id == d.id); S.adjType = d.t; S.amt = 100; S.modal = 'adjust'; render(); },\n  async adjust() { if (!(S.amt > 0)) return toast('请输入有效调账金额', 1); await api('POST', '/admin/adjust-balance', { targetUserId: S.target.id, amount: +S.amt, type: S.adjType }); toast('调账成功！'); S.modal = ''; await loadUsers(); await refreshMe(); render(); }\n};\napp.addEventListener('click', async e => {\n  const el = e.target.closest('[data-act]'); if (!el || !A[el.dataset.act]) return;\n  try { await A[el.dataset.act](el.dataset); } catch (x) { toast(x.message || '操作失败', 1); }\n});\nconst onIn = e => {\n  const el = e.target, m = el.dataset && el.dataset.m; if (!m) return;\n  const k = m.split('.'); let o = S; while (k.length > 1) o = o[k.shift()];\n  o[k[0]] = el.dataset.n ? Number(el.value) : el.value;\n  if (m === 'kw') renderList();\n  if (m === 'a.role' && e.type === 'change') render();\n};\napp.addEventListener('input', onIn); app.addEventListener('change', onIn);\napp.addEventListener('keydown', e => { if (e.key === 'Enter' && S.modal === 'auth' && e.target.tagName === 'INPUT') A[S.mode]().catch(x => toast(x.message, 1)); });\nwindow.addEventListener('error', e => toast('脚本错误: ' + e.message, 1));\n(async () => { render(); await refreshMe(); await loadOrders(); if (S.user && S.user.role === 'admin') await loadUsers(); render(); })();\n</script>\n</body>\n</html>\n";

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

async function getMe(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const p = await verifyToken(token, env.JWT_SECRET);
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
    if (!path.startsWith('/api/')) { // 页面已内嵌在本文件中，直接返回
      return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }
    if (path === '/api/health') { // 部署自检: 浏览器直接打开 /api/health 查看
      const h = { worker: true, db: !!env.DB, jwt: !!env.JWT_SECRET, adminKey: !!env.ADMIN_KEY, schema: 'ok' };
      if (env.DB) {
        try {
          await env.DB.prepare('SELECT id, user_code, username, password_hash, role, balance, frozen_deposit FROM users LIMIT 1').all();
          await env.DB.prepare('SELECT id, display_id, employer_id, booster_id, title, game_name, game_region, time_limit, description, bounty, deposit, status, proof_img FROM orders LIMIT 1').all();
        } catch (e) { h.schema = String(e.message).slice(0, 200); }
      }
      return json(h);
    }
    if (!env.DB) return err('服务器未绑定 D1 数据库(变量名需为 DB)', 500);
    if (!env.JWT_SECRET) return err('服务器未配置 JWT_SECRET', 500);

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
        return json({ success: true, user, token: await signToken({ uid: user.id }, env.JWT_SECRET) });
      }

      if (path === '/api/register' && method === 'POST') {
        const username = str(b.username, 20), password = str(b.password, 64), role = b.role;
        if (!/^[\w\u4e00-\u9fa5]{3,20}$/.test(username)) return err('账号名需为3-20位字母、数字、下划线或中文');
        if (password.length < 6) return err('密码至少6位');
        if (!['employer', 'booster', 'admin'].includes(role)) return err('角色不合法');
        if (role === 'admin' && (!env.ADMIN_KEY || !safeEq(String(b.adminKey || ''), env.ADMIN_KEY))) return err('管理员注册授权密钥不正确！');
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
        return json({ success: true, user, token: await signToken({ uid: user.id }, env.JWT_SECRET) });
      }

      const me = await getMe(request, env);

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
