const express = require('express');

const createReportRoutes = (pool, authMiddleware) => {
  const router = express.Router();

  async function withConn(fn) {
    const conn = await pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      conn.release();
    }
  }

  router.post('/api/resources/:id/report', authMiddleware, async (req, res) => {
    try {
      const { reason, description } = req.body;
      const resourceId = req.params.id;

      if (!reason) {
        return res.status(400).json({ message: '请选择举报原因' });
      }

      await withConn(async (conn) => {
        await conn.query(
          'INSERT INTO reports (user_id, resource_id, reason, description) VALUES (?, ?, ?, ?)',
          [req.user.id, resourceId, reason, description]
        );
      });

      res.json({ ok: true, message: '举报已提交，感谢您的反馈' });
    } catch (error) {
      res.status(500).json({ message: '举报失败' });
    }
  });

  return router;
};

module.exports = createReportRoutes;
