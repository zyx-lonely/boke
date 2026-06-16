const express = require('express');
const { withConn } = require('../config/database');
const { logger } = require('../middleware/logger');

const createNotificationRoutes = (authMiddleware) => {
  const router = express.Router();

  router.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(
          'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
          [req.user.id]
        );
        return rows;
      });
      const unread = rows.filter(n => !n.read).length;
      res.json({ rows, unread });
    } catch { res.status(500).json({ message: '获取失败' }); }
  });

  router.post('/api/notifications/read', authMiddleware, async (req, res) => {
    const { id } = req.body;
    try {
      await withConn(async (conn) => {
        if (id) {
          await conn.query('UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
        } else {
          await conn.query('UPDATE notifications SET `read` = 1 WHERE user_id = ?', [req.user.id]);
        }
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ message: '更新失败' }); }
  });

  return router;
};

async function createNotification(pool, userId, type, title, content, link) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, content || null, link || null]
    );
  } catch (e) {
    logger.warn('创建通知失败', { userId, type, error: e.message });
  }
}

module.exports = { createNotificationRoutes, createNotification };
