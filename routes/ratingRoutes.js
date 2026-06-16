const express = require('express');
const { withConn } = require('../config/database');

const createRatingRoutes = (pool, authMiddleware) => {
  const router = express.Router();

  router.post('/api/resources/:id/rating', authMiddleware, async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const resourceId = req.params.id;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: '评分必须为1-5星' });
      }

      let updatedRating;

      await withConn(async (conn) => {
        const [existing] = await conn.query(
          'SELECT * FROM ratings WHERE user_id = ? AND resource_id = ?',
          [req.user.id, resourceId]
        );

        if (existing.length > 0) {
          await conn.query(
            'UPDATE ratings SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [Number(rating), comment, existing[0].id]
          );
        } else {
          await conn.query(
            'INSERT INTO ratings (user_id, resource_id, rating, comment) VALUES (?, ?, ?, ?)',
            [req.user.id, resourceId, Number(rating), comment]
          );
        }

        const [avgResult] = await conn.query(
          'SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count FROM ratings WHERE resource_id = ?',
          [resourceId]
        );

        await conn.query(
          'UPDATE resources SET rating = ?, rating_count = ? WHERE id = ?',
          [avgResult[0].avg_rating || 0, avgResult[0].rating_count || 0, resourceId]
        );

        updatedRating = {
          rating: avgResult[0].avg_rating || 0,
          rating_count: avgResult[0].rating_count || 0
        };
      });

      res.json({ ok: true, message: '评价成功', ...updatedRating });
    } catch (error) {
      res.status(500).json({ message: '评分失败' });
    }
  });

  router.get('/api/resources/:id/rating', async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(
          'SELECT r.*, u.username FROM ratings r LEFT JOIN users u ON r.user_id = u.id WHERE r.resource_id = ? ORDER BY r.created_at DESC',
          [req.params.id]
        );
        return result;
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: '获取评分失败' });
    }
  });

  return router;
};

module.exports = createRatingRoutes;
