// ============================================
// QW电竞护航平台 - Cloudflare Worker API
// ============================================

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        
        // 设置CORS响应头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        };
        
        // 处理OPTIONS预检请求
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // 路由处理
            if (path.startsWith('/api/')) {
                return await handleAPI(request, env, ctx, corsHeaders);
            }
            
            // 静态资源处理（如果Worker同时托管静态资源）
            return env.ASSETS.fetch(request);
        } catch (error) {
            console.error('Error:', error);
            return jsonResponse({
                success: false,
                message: '服务器内部错误',
                error: error.message
            }, 500, corsHeaders);
        }
    }
};

// API路由处理
async function handleAPI(request, env, ctx, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 认证中间件
    const auth = await authenticate(request, env);
    
    // 用户相关API
    if (path.startsWith('/api/users')) {
        return handleUsers(request, env, auth, corsHeaders);
    }
    
    // 产品相关API
    if (path.startsWith('/api/products')) {
        return handleProducts(request, env, corsHeaders);
    }
    
    // 订单相关API
    if (path.startsWith('/api/orders')) {
        return handleOrders(request, env, auth, corsHeaders);
    }
    
    // 购物车相关API
    if (path.startsWith('/api/cart')) {
        return handleCart(request, env, auth, corsHeaders);
    }
    
    // 支付相关API
    if (path.startsWith('/api/payments')) {
        return handlePayments(request, env, auth, corsHeaders);
    }
    
    // 优惠券相关API
    if (path.startsWith('/api/coupons')) {
        return handleCoupons(request, env, auth, corsHeaders);
    }
    
    // 收藏相关API
    if (path.startsWith('/api/favorites')) {
        return handleFavorites(request, env, auth, corsHeaders);
    }
    
    // 统计相关API
    if (path.startsWith('/api/stats')) {
        return handleStats(request, env, corsHeaders);
    }
    
    return jsonResponse({
        success: false,
        message: '接口不存在'
    }, 404, corsHeaders);
}

// 认证中间件
async function authenticate(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return { authenticated: false, userId: null };
    }
    
    // 解析JWT token（简化实现）
    // 实际应该使用JWT验证
    const token = authHeader.replace('Bearer ', '');
    
    // TODO: 验证token
    // 这里只是示例
    try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        return { authenticated: true, userId: tokenData.sub };
    } catch (e) {
        return { authenticated: false, userId: null };
    }
}

// 用户相关API
async function handleUsers(request, env, auth, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 获取所有用户
    if (path === '/api/users' && method === 'GET') {
        const result = await env.DB.prepare('SELECT id, username, avatar_url, status, created_at FROM users WHERE status = 1 LIMIT 50').all();
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    // 获取单个用户
    if (path.match(/^\/api\/users\/\d+$/) && method === 'GET') {
        const userId = path.match(/^\/api\/users\/(\d+)$/)[1];
        const result = await env.DB.prepare('SELECT id, username, avatar_url, status, created_at FROM users WHERE id = ?').bind(userId).first();
        if (result) {
            return jsonResponse({ success: true, data: result }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders);
    }
    
    // 用户注册
    if (path === '/api/users/register' && method === 'POST') {
        const body = await request.json();
        
        if (!body.username || !body.password) {
            return jsonResponse({ success: false, message: '用户名和密码不能为空' }, 400, corsHeaders);
        }
        
        const result = await env.DB.prepare(
            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)'
        ).bind(body.username, body.password, body.email || '').run();
        
        if (result.success) {
            return jsonResponse({ success: true, message: '注册成功' }, 201, corsHeaders);
        }
        return jsonResponse({ success: false, message: '注册失败' }, 500, corsHeaders);
    }
    
    // 用户登录
    if (path === '/api/users/login' && method === 'POST') {
        const body = await request.json();
        
        if (!body.username || !body.password) {
            return jsonResponse({ success: false, message: '用户名和密码不能为空' }, 400, corsHeaders);
        }
        
        // 实际应该使用bcrypt等加密验证
        // 这里只是示例
        const result = await env.DB.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(body.username).first();
        
        if (result) {
            // 生成token（简化实现）
            const token = btoa(JSON.stringify({ sub: result.id, exp: Date.now() + 86400000 }));
            return jsonResponse({ 
                success: true, 
                data: { 
                    token: token, 
                    user: { id: result.id, username: result.username } 
                } 
            }, 200, corsHeaders);
        }
        
        return jsonResponse({ success: false, message: '用户名或密码错误' }, 401, corsHeaders);
    }
    
    // 获取用户详情（需要认证）
    if (path === '/api/users/me' && method === 'GET') {
        if (!auth.authenticated) {
            return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
        }
        
        const result = await env.DB.prepare(
            'SELECT id, username, avatar_url, status, created_at FROM users WHERE id = ?'
        ).bind(auth.userId).first();
        
        if (result) {
            return jsonResponse({ success: true, data: result }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 产品相关API
async function handleProducts(request, env, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 获取产品列表
    if (path === '/api/products' && method === 'GET') {
        const searchParams = url.searchParams;
        const game = searchParams.get('game');
        const serviceType = searchParams.get('serviceType');
        const sort = searchParams.get('sort') || 'default';
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        
        let query = `
            SELECT ps.*, g.name as game_name, g.icon as game_icon, 
                   st.name as service_type_name, st.icon as service_type_icon,
                   p.name as player_name, p.avatar_url as player_avatar
            FROM player_skills ps
            JOIN players p ON ps.player_id = p.id
            JOIN games g ON ps.game_id = g.id
            JOIN service_types st ON ps.service_type_id = st.id
            WHERE ps.is_active = 1 AND p.status = 1 AND p.verification_status = 1
        `;
        
        let params = [];
        
        if (game) {
            query += ' AND g.name = ?';
            params.push(game);
        }
        
        if (serviceType) {
            query += ' AND st.name = ?';
            params.push(serviceType);
        }
        
        switch (sort) {
            case 'price':
                query += ' ORDER BY ps.price_per_hour ASC';
                break;
            case 'rating':
                query += ' ORDER BY p.rating DESC';
                break;
            case 'sales':
                query += ' ORDER BY p.total_orders DESC';
                break;
            default:
                query += ' ORDER BY ps.sort_order ASC, p.rating DESC';
        }
        
        query += ' LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        
        const result = await env.DB.prepare(query).bind(...params).all();
        
        return jsonResponse({ 
            success: true, 
            data: result.results,
            pagination: {
                page: page,
                pageSize: pageSize,
                total: result.results.length
            }
        }, 200, corsHeaders);
    }
    
    // 获取单个产品
    if (path.match(/^\/api\/products\/\d+$/) && method === 'GET') {
        const productId = path.match(/^\/api\/products\/(\d+)$/)[1];
        
        const result = await env.DB.prepare(`
            SELECT ps.*, g.name as game_name, g.icon as game_icon,
                   st.name as service_type_name, st.icon as service_type_icon,
                   p.name as player_name, p.avatar_url as player_avatar, p.bio as player_bio,
                   p.rating as player_rating, p.total_orders as player_total_orders
            FROM player_skills ps
            JOIN players p ON ps.player_id = p.id
            JOIN games g ON ps.game_id = g.id
            JOIN service_types st ON ps.service_type_id = st.id
            WHERE ps.id = ? AND ps.is_active = 1
        `).bind(productId).first();
        
        if (result) {
            return jsonResponse({ success: true, data: result }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '产品不存在' }, 404, corsHeaders);
    }
    
    // 获取游戏列表
    if (path === '/api/products/games' && method === 'GET') {
        const result = await env.DB.prepare(
            'SELECT * FROM games WHERE is_active = 1 ORDER BY sort_order'
        ).all();
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    // 获取服务类型列表
    if (path === '/api/products/service-types' && method === 'GET') {
        const result = await env.DB.prepare(
            'SELECT * FROM service_types WHERE is_active = 1 ORDER BY sort_order'
        ).all();
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 订单相关API
async function handleOrders(request, env, auth, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    if (!auth.authenticated) {
        return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
    }
    
    // 获取订单列表
    if (path === '/api/orders' && method === 'GET') {
        const searchParams = url.searchParams;
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        
        let query = `
            SELECT o.*, p.name as player_name, g.name as game_name,
                   st.name as service_type_name, ps.level
            FROM orders o
            JOIN players p ON o.player_id = p.id
            JOIN player_skills ps ON o.skill_id = ps.id
            JOIN games g ON ps.game_id = g.id
            JOIN service_types st ON ps.service_type_id = st.id
            WHERE o.user_id = ?
        `;
        
        let params = [auth.userId];
        
        if (status !== null) {
            query += ' AND o.status = ?';
            params.push(parseInt(status));
        }
        
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        
        const result = await env.DB.prepare(query).bind(...params).all();
        
        return jsonResponse({ 
            success: true, 
            data: result.results,
            pagination: {
                page: page,
                pageSize: pageSize,
                total: result.results.length
            }
        }, 200, corsHeaders);
    }
    
    // 获取单个订单
    if (path.match(/^\/api\/orders\/[^\/]+$/) && method === 'GET') {
        const orderNo = path.match(/^\/api\/orders\/([^\/]+)$/)[1];
        
        const result = await env.DB.prepare(`
            SELECT o.*, p.name as player_name, p.avatar_url as player_avatar,
                   g.name as game_name, g.icon as game_icon,
                   st.name as service_type_name, ps.level
            FROM orders o
            JOIN players p ON o.player_id = p.id
            JOIN player_skills ps ON o.skill_id = ps.id
            JOIN games g ON ps.game_id = g.id
            JOIN service_types st ON ps.service_type_id = st.id
            WHERE o.order_no = ? AND o.user_id = ?
        `).bind(orderNo, auth.userId).first();
        
        if (result) {
            return jsonResponse({ success: true, data: result }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '订单不存在' }, 404, corsHeaders);
    }
    
    // 创建订单
    if (path === '/api/orders' && method === 'POST') {
        const body = await request.json();
        
        if (!body.skillId || !body.startTime || !body.durationHours) {
            return jsonResponse({ success: false, message: '参数不完整' }, 400, corsHeaders);
        }
        
        // 获取技能信息
        const skill = await env.DB.prepare('SELECT * FROM player_skills WHERE id = ?').bind(body.skillId).first();
        if (!skill) {
            return jsonResponse({ success: false, message: '技能不存在' }, 404, corsHeaders);
        }
        
        // 生成订单号
        const orderNo = generateOrderNo();
        const totalAmount = skill.price_per_hour * body.durationHours;
        
        const result = await env.DB.prepare(`
            INSERT INTO orders (order_no, user_id, player_id, skill_id, game_account, contact_info, 
                               start_time, duration_hours, total_amount, pay_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
            orderNo, 
            auth.userId, 
            skill.player_id, 
            body.skillId,
            body.gameAccount,
            body.contactInfo,
            body.startTime,
            body.durationHours,
            totalAmount,
            totalAmount
        ).run();
        
        if (result.success) {
            return jsonResponse({ 
                success: true, 
                message: '订单创建成功',
                data: { orderId: result.meta.last_row_id, orderNo: orderNo }
            }, 201, corsHeaders);
        }
        return jsonResponse({ success: false, message: '订单创建失败' }, 500, corsHeaders);
    }
    
    // 取消订单
    if (path.match(/^\/api\/orders\/[^\/]+\/cancel$/) && method === 'POST') {
        const orderNo = path.match(/^\/api\/orders\/([^\/]+)\/cancel$/)[1];
        
        const result = await env.DB.prepare(
            'UPDATE orders SET status = 4, updated_at = datetime(\'now\') WHERE order_no = ? AND user_id = ? AND status = 0'
        ).bind(orderNo, auth.userId).run();
        
        if (result.success && result.meta.changes > 0) {
            return jsonResponse({ success: true, message: '订单已取消' }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '订单无法取消' }, 400, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 购物车相关API
async function handleCart(request, env, auth, corsHeaders) {
    // 购物车通常存储在客户端，这里提供示例接口
    return jsonResponse({ success: false, message: '购物车功能在客户端实现' }, 200, corsHeaders);
}

// 支付相关API
async function handlePayments(request, env, auth, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    if (!auth.authenticated) {
        return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
    }
    
    // 创建支付
    if (path === '/api/payments' && method === 'POST') {
        const body = await request.json();
        
        if (!body.orderId || !body.paymentMethod) {
            return jsonResponse({ success: false, message: '参数不完整' }, 400, corsHeaders);
        }
        
        const order = await env.DB.prepare(
            'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 0'
        ).bind(body.orderId, auth.userId).first();
        
        if (!order) {
            return jsonResponse({ success: false, message: '订单不存在或状态不正确' }, 404, corsHeaders);
        }
        
        // 创建支付记录
        const result = await env.DB.prepare(`
            INSERT INTO payments (order_id, user_id, amount, payment_method, payment_status)
            VALUES (?, ?, ?, ?, 0)
        `).bind(order.id, auth.userId, order.pay_amount, body.paymentMethod).run();
        
        if (result.success) {
            // TODO: 调用支付网关
            // 这里返回支付信息
            
            return jsonResponse({ 
                success: true, 
                data: { 
                    paymentId: result.meta.last_row_id,
                    amount: order.pay_amount,
                    paymentMethod: body.paymentMethod
                }
            }, 201, corsHeaders);
        }
        
        return jsonResponse({ success: false, message: '支付创建失败' }, 500, corsHeaders);
    }
    
    // 支付回调
    if (path === '/api/payments/notify' && method === 'POST') {
        const body = await request.json();
        
        // 验证支付签名（实际应该验证）
        
        // 更新支付状态
        await env.DB.prepare(
            'UPDATE payments SET payment_status = 1, payment_time = datetime(\'now\') WHERE transaction_id = ?'
        ).bind(body.transactionId).run();
        
        // 更新订单状态
        await env.DB.prepare(
            'UPDATE orders SET status = 1, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(body.orderId).run();
        
        return jsonResponse({ success: true }, 200, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 优惠券相关API
async function handleCoupons(request, env, auth, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 获取可用优惠券
    if (path === '/api/coupons' && method === 'GET') {
        if (!auth.authenticated) {
            return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
        }
        
        const result = await env.DB.prepare(`
            SELECT c.*, uc.id as user_coupon_id, uc.status as user_coupon_status
            FROM coupons c
            LEFT JOIN user_coupons uc ON c.id = uc.coupon_id AND uc.user_id = ?
            WHERE c.is_active = 1 AND c.end_time > datetime('now')
            AND (uc.id IS NULL OR uc.status = 0)
        `).bind(auth.userId).all();
        
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    // 领取优惠券
    if (path === '/api/coupons/receive' && method === 'POST') {
        if (!auth.authenticated) {
            return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
        }
        
        const body = await request.json();
        
        const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE id = ? AND is_active = 1').bind(body.couponId).first();
        
        if (!coupon) {
            return jsonResponse({ success: false, message: '优惠券不存在' }, 404, corsHeaders);
        }
        
        if (coupon.total_quantity > 0 && coupon.used_quantity >= coupon.total_quantity) {
            return jsonResponse({ success: false, message: '优惠券已领完' }, 400, corsHeaders);
        }
        
        const result = await env.DB.prepare(
            'INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)'
        ).bind(auth.userId, body.couponId).run();
        
        if (result.success) {
            await env.DB.prepare(
                'UPDATE coupons SET used_quantity = used_quantity + 1 WHERE id = ?'
            ).bind(body.couponId).run();
            
            return jsonResponse({ success: true, message: '领取成功' }, 201, corsHeaders);
        }
        
        return jsonResponse({ success: false, message: '领取失败' }, 500, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 收藏相关API
async function handleFavorites(request, env, auth, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    if (!auth.authenticated) {
        return jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders);
    }
    
    // 获取收藏列表
    if (path === '/api/favorites' && method === 'GET') {
        const result = await env.DB.prepare(`
            SELECT f.*, p.name as player_name, p.avatar_url as player_avatar,
                   g.name as game_name, st.name as service_type_name
            FROM favorites f
            JOIN players p ON f.player_id = p.id
            LEFT JOIN player_skills ps ON f.skill_id = ps.id
            LEFT JOIN games g ON ps.game_id = g.id
            LEFT JOIN service_types st ON ps.service_type_id = st.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `).bind(auth.userId).all();
        
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    // 添加收藏
    if (path === '/api/favorites' && method === 'POST') {
        const body = await request.json();
        
        if (!body.playerId) {
            return jsonResponse({ success: false, message: '参数不完整' }, 400, corsHeaders);
        }
        
        const result = await env.DB.prepare(
            'INSERT INTO favorites (user_id, player_id, skill_id) VALUES (?, ?, ?)'
        ).bind(auth.userId, body.playerId, body.skillId || null).run();
        
        if (result.success) {
            return jsonResponse({ success: true, message: '收藏成功' }, 201, corsHeaders);
        }
        return jsonResponse({ success: false, message: '收藏失败' }, 500, corsHeaders);
    }
    
    // 取消收藏
    if (path.match(/^\/api\/favorites\/\d+$/) && method === 'DELETE') {
        const favoriteId = path.match(/^\/api\/favorites\/(\d+)$/)[1];
        
        const result = await env.DB.prepare(
            'DELETE FROM favorites WHERE id = ? AND user_id = ?'
        ).bind(favoriteId, auth.userId).run();
        
        if (result.success && result.meta.changes > 0) {
            return jsonResponse({ success: true, message: '取消成功' }, 200, corsHeaders);
        }
        return jsonResponse({ success: false, message: '取消失败' }, 400, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 统计相关API
async function handleStats(request, env, corsHeaders) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 获取平台统计
    if (path === '/api/stats/platform' && request.method === 'GET') {
        const totalUsers = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        const totalPlayers = await env.DB.prepare('SELECT COUNT(*) as count FROM players WHERE status = 1').first();
        const totalOrders = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first();
        const totalRevenue = await env.DB.prepare('SELECT COALESCE(SUM(pay_amount), 0) as total FROM orders WHERE status IN (2, 3)').first();
        
        return jsonResponse({
            success: true,
            data: {
                totalUsers: totalUsers.results[0].count,
                totalPlayers: totalPlayers.results[0].count,
                totalOrders: totalOrders.results[0].count,
                totalRevenue: totalRevenue.results[0].total
            }
        }, 200, corsHeaders);
    }
    
    // 获取游戏统计
    if (path === '/api/stats/games' && request.method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM game_statistics').all();
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    // 获取订单状态统计
    if (path === '/api/stats/orders' && request.method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM order_statistics').all();
        return jsonResponse({ success: true, data: result.results }, 200, corsHeaders);
    }
    
    return jsonResponse({ success: false, message: '接口不存在' }, 404, corsHeaders);
}

// 工具函数
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
}

function generateOrderNo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `QW${year}${month}${day}${hour}${minute}${second}${random}`;
}