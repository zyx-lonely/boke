const express = require('express');
const { withConn } = require('../config/database');

const createSettingsRoutes = (pool, authMiddleware, adminMiddleware) => {
  const router = express.Router();

  router.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT `key`, `value` FROM settings');
        return rows;
      });
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value });
      res.json(settings);
    } catch (e) { next(e) }
  });

  router.put('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
      const updates = req.body;
      await withConn(async (conn) => {
        for (const [key, value] of Object.entries(updates)) {
          await conn.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, value]);
        }
      });
      res.json({ ok: true });
    } catch (e) { next(e) }
  });

  router.get('/api/settings', async (req, res, next) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT `key`, `value` FROM settings');
        return rows;
      });
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value });
      res.json(settings);
    } catch (e) { next(e) }
  });

  return router;
};

module.exports = createSettingsRoutes;
