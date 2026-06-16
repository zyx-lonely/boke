const express = require('express');
const { withConn } = require('../config/database');

const createSearchRoutes = () => {
  const router = express.Router();

  router.get('/api/search', async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || !q.trim()) return res.json({ rows: [], total: 0, page: 1 });
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const offset = (pageNum - 1) * limitNum;
    const keyword = q.trim();
    if (keyword.length < 2) return res.json({ rows: [], total: 0, page: pageNum });
    try {
      const searchTerm = keyword.replace(/[+\-@~*()<>"']/g, ' ') + '*';
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT id, title, software_name, summary, hits, created_at,
                 MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE) as relevance
          FROM resources
          WHERE status = 'approved'
            AND MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE)
          ORDER BY relevance DESC
          LIMIT ? OFFSET ?
        `, [searchTerm, searchTerm, limitNum, offset]);
        const [[{ total }]] = await conn.query(`
          SELECT COUNT(*) as total FROM resources
          WHERE status = 'approved'
            AND MATCH(title, summary, content) AGAINST(? IN BOOLEAN MODE)
        `, [searchTerm]);
        return { rows, total };
      });
      res.json({ ...result, page: pageNum });
    } catch { res.status(500).json({ message: '搜索失败' }); }
  });

  router.get('/api/archive', async (req, res) => {
    try {
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
