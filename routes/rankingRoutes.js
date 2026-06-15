const express = require('express');

const createRankingRoutes = (pool) => {
  const router = express.Router();

  async function withConn(fn) {
    const conn = await pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      conn.release();
    }
  }

  router.get('/api/rankings', async (req, res) => {
    const type = req.query.type || 'views';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;

    const validOrderBy = {
      views: 'r.hits DESC',
      favorites: 'favorites_count DESC',
      comments: 'comments_count DESC'
    };

    const orderBy = validOrderBy[type] || 'r.hits DESC';

    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`
          SELECT r.*, cat.name as category_name,
                 COALESCE(f.cnt, 0) as favorites_count,
                 COALESCE(c.cnt, 0) as comments_count
          FROM resources r
          LEFT JOIN categories cat ON r.category_id = cat.id
          LEFT JOIN (SELECT resource_id, COUNT(*) as cnt FROM favorites GROUP BY resource_id) f ON r.id = f.resource_id
          LEFT JOIN (SELECT resource_id, COUNT(*) as cnt FROM comments WHERE status = 'approved' GROUP BY resource_id) c ON r.id = c.resource_id
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?
        `, [limit, offset]);
        return result;
      });

      res.json({ items: rows });
    } catch (error) {
      res.status(500).json({ message: '获取排行榜失败' });
    }
  });

  return router;
};

module.exports = createRankingRoutes;
