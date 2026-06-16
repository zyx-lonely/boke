const express = require('express');
const jwt = require('jsonwebtoken');
const { withConn } = require('../config/database');
const parseRow = require('../utils/parseRow');

const createFavoriteRoutes = (authMiddleware) => {
  const router = express.Router();

  router.get('/api/resources/:id/favorite/check', async (req, res) => {
    const rawToken = req.headers.authorization;
    const token = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken) : null;
    const jwtSecret = process.env.JWT_SECRET;

    try {
      const result = await withConn(async (conn) => {
        const [countRows] = await conn.query(`SELECT COUNT(*) as count FROM favorites WHERE resource_id = ?`, [req.params.id]);
        const count = countRows[0].count || 0;

        if (!token) {
          return { favorited: false, count };
        }

        try {
          const decoded = jwt.verify(token, jwtSecret);
          const [existing] = await conn.query(`SELECT id FROM favorites WHERE user_id = ? AND resource_id = ?`, [decoded.id, req.params.id]);
          return { favorited: existing.length > 0, count };
        } catch {
          return { favorited: false, count };
        }
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: '检查收藏状态失败' });
    }
  });

  router.post('/api/resources/:id/favorite', authMiddleware, async (req, res) => {
    try {
      await withConn(async (conn) => {
        const [checkRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [req.params.id]);
        if (checkRows.length === 0) {
          return res.status(404).json({ message: '资源不存在' });
        }

        const [existing] = await conn.query(`SELECT id FROM favorites WHERE user_id = ? AND resource_id = ?`, [req.user.id, req.params.id]);

        if (existing.length > 0) {
          await conn.query(`DELETE FROM favorites WHERE id = ?`, [existing[0].id]);
        } else {
          await conn.query(`INSERT INTO favorites (user_id, resource_id) VALUES (?, ?)`, [req.user.id, req.params.id]);
        }

        const [countRows] = await conn.query(`SELECT COUNT(*) as count FROM favorites WHERE resource_id = ?`, [req.params.id]);
        const count = countRows[0].count || 0;

        res.json({ favorited: existing.length === 0, count });
      });
    } catch (error) {
      res.status(500).json({ message: '收藏失败' });
    }
  });

  router.get('/api/users/favorites', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.* FROM resources r
          JOIN favorites f ON r.id = f.resource_id
          WHERE f.user_id = ? AND r.status = 'approved'
          ORDER BY f.created_at DESC
        `, [req.user.id]);
        return rows;
      });
      res.json(rows.map(parseRow));
    } catch (error) {
      res.status(500).json({ message: '获取收藏失败' });
    }
  });

  router.get('/api/favorites', async (req, res) => {
    const jwtSecret = process.env.JWT_SECRET;
    const rawToken = req.headers.authorization;
    const token = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken) : null;
    let userId = 0;

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        userId = decoded.id;
      } catch {
        userId = 0;
      }
    }

    if (userId === 0) {
      return res.json({ items: [] });
    }

    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.* FROM resources r
          JOIN favorites f ON r.id = f.resource_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `, [userId]);
        return rows;
      });

      res.json({ items: rows });
    } catch (error) {
      res.status(500).json({ message: '获取收藏失败' });
    }
  });

  router.delete('/api/favorites/:resourceId', async (req, res) => {
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET;
    const rawToken = req.headers.authorization;
    const token = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken) : null;
    let userId = 0;

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        userId = decoded.id;
      } catch {
        return res.status(401).json({ message: '未登录' });
      }
    }

    if (userId === 0) {
      return res.status(401).json({ message: '未登录' });
    }

    try {
      const result = await withConn(async (conn) => {
        const [result] = await conn.query(`DELETE FROM favorites WHERE user_id = ? AND resource_id = ?`, [userId, req.params.resourceId]);
        return result;
      });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '收藏不存在' });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: '取消收藏失败' });
    }
  });

  return router;
};

module.exports = createFavoriteRoutes;
