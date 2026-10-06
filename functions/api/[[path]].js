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
