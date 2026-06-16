const express = require('express');
const { withConn } = require('../config/database');

const createReportRoutes = (authMiddleware) => {
  const router = express.Router();

  router.post('/api/resources/:id/report', authMiddleware, async (req, res) => {
    try {
      const { reason, description } = req.body;
      const resourceId = req.params.id;

      if (!reason) {
        return res.status(400).json({ message: '请选择举报原因' });
      }

      const exists = await withConn(async (conn) => {
        const [resources] = await conn.query('SELECT id FROM resources WHERE id = ?', [resourceId]);
        if (resources.length === 0) return false;
        await conn.query(
          'INSERT INTO reports (user_id, resource_id, reason, description) VALUES (?, ?, ?, ?)',
          [req.user.id, resourceId, reason, description]
        );
        return true;
      });

      if (!exists) return res.status(404).json({ message: '资源不存在' });
      res.json({ ok: true, message: '举报已提交，感谢您的反馈' });
    } catch (error) {
      res.status(500).json({ message: '举报失败' });
    }
  });

  return router;
};

module.exports = createReportRoutes;
