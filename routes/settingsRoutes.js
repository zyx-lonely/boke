const express = require('express');
const { withConn, pool } = require('../config/database');
const { sendMail } = require('../services/emailService');

const createSettingsRoutes = (authMiddleware, adminMiddleware) => {
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

  router.post('/api/admin/settings/test-email', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { email, settings } = req.body;
      if (!email) return res.status(400).json({ message: '请输入测试邮箱' });
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          if (key.startsWith('smtp_')) {
            await pool.query("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, value]);
          }
        }
      }
      const sent = await sendMail(pool, email, '测试邮件', '<h2>测试邮件</h2><p>如果您收到此邮件，说明 SMTP 配置正确。</p>');
      if (sent) res.json({ ok: true, message: '发送成功' });
      else res.status(500).json({ message: '发送失败，请检查 SMTP 配置' });
    } catch { res.status(500).json({ message: '发送失败' }); }
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
