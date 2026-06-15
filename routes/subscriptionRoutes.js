const express = require('express');

const createSubscriptionRoutes = (pool, authMiddleware) => {
  const router = express.Router();

  async function withConn(fn) {
    const conn = await pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      conn.release();
    }
  }

  router.post('/api/subscriptions', authMiddleware, async (req, res) => {
    try {
      const { category_id } = req.body;

      if (!category_id) {
        return res.status(400).json({ message: '缺少分类ID' });
      }

      await withConn(async (conn) => {
        const [existing] = await conn.query(
          'SELECT id FROM subscriptions WHERE user_id = ? AND category_id = ?',
          [req.user.id, category_id]
        );

        if (existing.length > 0) {
          await conn.query('DELETE FROM subscriptions WHERE id = ?', [existing[0].id]);
          res.json({ subscribed: false, message: '已取消订阅' });
        } else {
          await conn.query(
            'INSERT INTO subscriptions (user_id, category_id) VALUES (?, ?)',
            [req.user.id, category_id]
          );
          res.json({ subscribed: true, message: '订阅成功' });
        }
      });
    } catch (error) {
      res.status(500).json({ message: '订阅失败' });
    }
  });

  router.get('/api/subscriptions', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`
          SELECT s.*, c.name, c.icon
          FROM subscriptions s
          LEFT JOIN categories c ON s.category_id = c.id
          WHERE s.user_id = ?
          ORDER BY s.created_at DESC
        `, [req.user.id]);
        return result;
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: '获取订阅失败' });
    }
  });

  router.get('/api/subscriptions/check/:categoryId', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(
          'SELECT id FROM subscriptions WHERE user_id = ? AND category_id = ?',
          [req.user.id, req.params.categoryId]
        );
        return result;
      });
      res.json({ subscribed: rows.length > 0 });
    } catch (error) {
      res.status(500).json({ message: '检查订阅失败' });
    }
  });

  return router;
};

module.exports = createSubscriptionRoutes;
