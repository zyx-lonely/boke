const express = require('express');
const crypto = require('crypto');
const { withConn, pool } = require('../config/database');
const { sendMail } = require('../services/emailService');

const createProfileRoutes = (authMiddleware) => {
  const router = express.Router();

  router.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(
          'SELECT id, username, email, email_verified, avatar, role, status, created_at FROM users WHERE id = ?',
          [req.user.id]
        );
        return rows;
      });
      if (rows.length === 0) return res.status(404).json({ message: '用户不存在' });
      res.json(rows[0]);
    } catch { res.status(500).json({ message: '获取用户信息失败' }); }
  });

  router.put('/api/user/profile', authMiddleware, async (req, res) => {
    const { email } = req.body;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    try {
      await withConn(async (conn) => {
        await conn.query('UPDATE users SET email = ?, email_verified = 0, verification_token = NULL WHERE id = ?', [email || null, req.user.id]);
      });
      res.json({ ok: true, message: '更新成功' });
    } catch { res.status(500).json({ message: '更新失败' }); }
  });

  router.post('/api/user/resend-verification', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT email, email_verified, username FROM users WHERE id = ?', [req.user.id]);
        return rows;
      });
      if (rows.length === 0) return res.status(404).json({ message: '用户不存在' });
      const user = rows[0];
      if (!user.email) return res.status(400).json({ message: '请先设置邮箱' });
      if (user.email_verified) return res.json({ message: '邮箱已验证，无需重复验证' });

      const token = crypto.randomBytes(32).toString('hex');
      const [settings] = await withConn(async (conn) => {
        const [rows] = await conn.query("SELECT `key`, `value` FROM settings WHERE `key` = 'site_url'");
        return rows;
      });
      const siteUrl = settings.length > 0 ? settings[0].value : `${req.protocol}://${req.get('host')}`;
      await withConn(async (conn) => {
        await conn.query('UPDATE users SET verification_token = ? WHERE id = ?', [token, req.user.id]);
      });

      const verifyUrl = `${siteUrl}/verify-email?token=${token}`;
      await sendMail(pool, user.email, '验证您的邮箱', `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#667eea">邮箱验证</h2>
          <p>您好 <strong>${user.username}</strong>，</p>
          <p>请点击下方链接验证您的邮箱：</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-decoration:none;border-radius:10px;margin:16px 0">验证邮箱</a>
          <p style="color:#999;font-size:13px">链接有效期为24小时，如非本人操作请忽略。</p>
        </div>`);
      res.json({ ok: true, message: '验证邮件已发送' });
    } catch { res.status(500).json({ message: '发送失败' }); }
  });

  router.get('/api/user/comments', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT c.*, r.title as resource_title
          FROM comments c
          LEFT JOIN resources r ON c.resource_id = r.id
          WHERE c.username = ?
          ORDER BY c.created_at DESC
          LIMIT 50
        `, [req.user.username]);
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取评论失败' }); }
  });

  router.get('/api/user/favorites', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.id, r.title, r.software_name, r.summary, r.hits, r.created_at,
                 c.name as category_name
          FROM favorites f
          JOIN resources r ON f.resource_id = r.id
          LEFT JOIN categories c ON r.category_id = c.id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `, [req.user.id]);
        return rows;
      });
      res.json(rows);
    } catch { res.status(500).json({ message: '获取收藏失败' }); }
  });

  return router;
};

module.exports = createProfileRoutes;
