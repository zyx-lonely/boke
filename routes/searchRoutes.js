const express = require('express');

const createSearchRoutes = () => {
  const router = express.Router();

  router.get('/api/search', async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || !q.trim()) return res.json({ rows: [], total: 0, page: 1 });
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const keyword = q.trim();
    try {
      const { withConn } = require('../config/database');
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT id, title, software_name, summary, hits, created_at,
                 MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE) as relevance
          FROM resources
          WHERE status = 'approved'
            AND MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE)
          ORDER BY relevance DESC
          LIMIT ? OFFSET ?
        `, [keyword + '*', keyword + '*', parseInt(limit), offset]);
        const [[{ total }]] = await conn.query(`
          SELECT COUNT(*) as total FROM resources
          WHERE status = 'approved'
            AND MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE)
        `, [keyword + '*']);
        return { rows, total };
      });
      res.json({ ...result, page: Math.max(1, parseInt(page)) });
    } catch { res.status(500).json({ message: '搜索失败' }); }
  });

  router.get('/api/archive', async (req, res) => {
    try {
      const { withConn } = require('../config/database');
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT id, title, software_name, summary, hits, created_at
          FROM resources
          WHERE status = 'approved'
          ORDER BY created_at DESC
        `);
        return rows;
      });
      const grouped = {};
      rows.forEach(r => {
        const key = new Date(r.created_at).toISOString().slice(0, 7);
        if (!grouped[key]) grouped[key] = { month: key, count: 0, items: [] };
        grouped[key].count++;
        grouped[key].items.push(r);
      });
      res.json(Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month)));
    } catch { res.status(500).json({ message: '获取归档失败' }); }
  });

  return router;
};

module.exports = createSearchRoutes;
