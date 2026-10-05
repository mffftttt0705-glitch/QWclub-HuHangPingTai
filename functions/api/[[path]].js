// 6位 ID 混淆算法 (复用原算法)
function generate6DigitID(orderPrimaryId) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let hash = (orderPrimaryId * 9301 + 49297) % 233280;
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor((hash + i * 17 + Math.random() * 32) % chars.length);
    result += chars[randomIndex];
  }
  return result;
}

// 通用 JSON 响应函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const db = env.DB; // 绑定 Cloudflare D1

  try {
    // 1. GET /api/users
    if (path === '/api/users' && method === 'GET') {
      const { results } = await db.prepare("SELECT * FROM users").all();
      return jsonResponse({ success: true, data: results });
    }

    // 2. GET /api/orders
    if (path === '/api/orders' && method === 'GET') {
      const status = url.searchParams.get('status');
      let sql = `
        SELECT o.*, e.username as employer_name, b.username as booster_name 
        FROM orders o
        LEFT JOIN users e ON o.employer_id = e.id
        LEFT JOIN users b ON o.booster_id = b.id
      `;
      let stmt;
      if (status !== null && status !== '') {
        sql += " WHERE o.status = ? ORDER BY o.created_at DESC";
        stmt = db.prepare(sql).bind(parseInt(status));
      } else {
        sql += " ORDER BY o.created_at DESC";
        stmt = db.prepare(sql);
      }
      const { results } = await stmt.all();
      return jsonResponse({ success: true, data: results });
    }

    // 3. POST /api/orders/create
    if (path === '/api/orders/create' && method === 'POST') {
      const body = await request.json();
      const { employerId, title, gameName, gameRegion, accountInfo, bounty, deposit } = body;

      const employer = await db.prepare("SELECT * FROM users WHERE id = ?").bind(employerId).first();
      if (!employer || employer.red_diamonds < bounty) {
        return jsonResponse({ success: false, message: "红钻余额不足，无法发布订单" }, 400);
      }

      // Cloudflare D1 事务批量执行
      const insertRes = await db.prepare(
        "INSERT INTO orders (display_id, title, game_name, game_region, account_info, bounty, deposit, status, employer_id) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)"
      ).bind('TEMP', title, gameName, gameRegion || '', accountInfo || '', bounty, deposit, employerId).run();

      const primaryId = insertRes.meta.last_row_id;
      const displayId = generate6DigitID(primaryId);

      await db.batch([
        db.prepare("UPDATE users SET red_diamonds = red_diamonds - ? WHERE id = ?").bind(bounty, employerId),
        db.prepare("UPDATE orders SET display_id = ? WHERE id = ?").bind(displayId, primaryId)
      ]);

      return jsonResponse({ success: true, data: { displayId } });
    }

    // 4. POST /api/orders/accept
    if (path === '/api/orders/accept' && method === 'POST') {
      const { orderId, boosterId } = await request.json();
      const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
      const booster = await db.prepare("SELECT * FROM users WHERE id = ?").bind(boosterId).first();

      if (!order || order.status !== 0) {
        return jsonResponse({ success: false, message: "订单不存在或已经被抢接" }, 400);
      }
      if (!booster || booster.red_diamonds < order.deposit) {
        return jsonResponse({ success: false, message: "红钻余额不足以缴纳保证金" }, 400);
      }

      await db.batch([
        db.prepare("UPDATE users SET red_diamonds = red_diamonds - ?, frozen_diamonds = frozen_diamonds + ? WHERE id = ?").bind(order.deposit, order.deposit, boosterId),
        db.prepare("UPDATE orders SET status = 1, booster_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(boosterId, orderId)
      ]);

      return jsonResponse({ success: true, message: "抢单成功！保证金已冻结" });
    }

    // 5. POST /api/orders/complete
    if (path === '/api/orders/complete' && method === 'POST') {
      const { orderId, boosterId, proofImg } = await request.json();
      await db.prepare("UPDATE orders SET status = 2, proof_img = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND booster_id = ?")
        .bind(proofImg || '完工截图凭证', orderId, boosterId).run();
      return jsonResponse({ success: true, message: "已提交完工，等待验收" });
    }

    // 6. POST /api/orders/confirm
    if (path === '/api/orders/confirm' && method === 'POST') {
      const { orderId, employerId } = await request.json();
      const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND employer_id = ?").bind(orderId, employerId).first();

      if (!order || order.status !== 2) {
        return jsonResponse({ success: false, message: "订单未处于待验收状态" }, 400);
      }

      await db.batch([
        db.prepare("UPDATE users SET frozen_diamonds = frozen_diamonds - ?, red_diamonds = red_diamonds + ? + ? WHERE id = ?").bind(order.deposit, order.deposit, order.bounty, order.booster_id),
        db.prepare("UPDATE orders SET status = 3, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId)
      ]);

      return jsonResponse({ success: true, message: "确认结算成功！赏金与保证金已打入打手账户" });
    }

    return jsonResponse({ error: "API 接口不存在" }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
