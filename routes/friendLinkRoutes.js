const express = require('express');
const { withConn } = require('../config/database');

const createFriendLinkRoutes = (authMiddleware, adminMiddleware) => {
  const router = express.Router();

  router.get('/api/friend-links', async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT id, name, url, description, logo, sort_order FROM friend_links WHERE status = "active" ORDER BY sort_order ASC, id ASC');
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取失败' }); }
  });

  router.get('/api/admin/friend-links', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT * FROM friend_links ORDER BY sort_order ASC, id ASC');
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取失败' }); }
  });

  router.post('/api/admin/friend-links', authMiddleware, adminMiddleware, async (req, res) => {
    const { name, url, description, logo, sort_order, status } = req.body;
    if (!name || !url) return res.status(400).json({ message: '名称和链接不能为空' });
    if (!/^https?:\/\/.+/.test(url)) return res.status(400).json({ message: '链接格式不正确' });
    try {
      const result = await withConn(async (conn) => {
        const [result] = await conn.query(
          'INSERT INTO friend_links (name, url, description, logo, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
          [name, url, description || null, logo || null, sort_order || 0, status || 'active']
        );
        return result;
      });
      res.json({ ok: true, id: result.insertId });
    } catch { res.status(500).json({ message: '创建失败' }); }
  });

  router.put('/api/admin/friend-links/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { name, url, description, logo, sort_order, status } = req.body;
    if (!name || !url) return res.status(400).json({ message: '名称和链接不能为空' });
    if (!/^https?:\/\/.+/.test(url)) return res.status(400).json({ message: '链接格式不正确' });
    try {
      await withConn(async (conn) => {
        await conn.query(
          'UPDATE friend_links SET name = ?, url = ?, description = ?, logo = ?, sort_order = ?, status = ? WHERE id = ?',
          [name, url, description || null, logo || null, sort_order || 0, status || 'active', req.params.id]
        );
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ message: '更新失败' }); }
  });

  router.delete('/api/admin/friend-links/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await withConn(async (conn) => {
        await conn.query('DELETE FROM friend_links WHERE id = ?', [req.params.id]);
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ message: '删除失败' }); }
  });

  return router;
};

module.exports = createFriendLinkRoutes;
