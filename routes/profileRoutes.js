const express = require('express');
const { withConn } = require('../config/database');

const createProfileRoutes = (authMiddleware) => {
  const router = express.Router();

  router.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(
          'SELECT id, username, email, avatar, role, status, created_at FROM users WHERE id = ?',
          [req.user.id]
        );
        return rows;
      });
      if (rows.length === 0) return res.status(404).json({ message: '用户不存在' });
      res.json(rows[0]);
    } catch { res.status(500).json({ message: '获取用户信息失败' }); }
  });

  router.put('/api/user/profile', authMiddleware, async (req, res) => {
    const { email } = req.body;
    try {
      await withConn(async (conn) => {
        await conn.query('UPDATE users SET email = ? WHERE id = ?', [email || null, req.user.id]);
      });
      res.json({ ok: true, message: '更新成功' });
    } catch { res.status(500).json({ message: '更新失败' }); }
  });

  router.get('/api/user/comments', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT c.*, r.title as resource_title
          FROM comments c
          LEFT JOIN resources r ON c.resource_id = r.id
          WHERE c.username = ?
          ORDER BY c.created_at DESC
          LIMIT 50
        `, [req.user.username]);
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取评论失败' }); }
  });

  router.get('/api/user/favorites', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.id, r.title, r.software_name, r.summary, r.hits, r.created_at,
                 c.name as category_name
          FROM favorites f
          JOIN resources r ON f.resource_id = r.id
          LEFT JOIN categories c ON r.category_id = c.id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `, [req.user.id]);
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取收藏失败' }); }
  });

  return router;
};

module.exports = createProfileRoutes;
