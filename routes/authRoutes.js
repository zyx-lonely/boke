const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const { withConn } = require('../config/database');

const createAuthRoutes = (pool, authMiddleware, adminMiddleware, logOperation, captchaStore, loginAttempts) => {
  const router = express.Router();
  const jwtSecret = process.env.JWT_SECRET;
  const loginAttemptLimit = parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5;
  const loginLockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 300000;

  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET 环境变量未设置！');
    process.exit(1);
  }

  function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '';
  }

  function validatePassword(password) {
    if (password.length < 8) {
      return '密码长度至少8位';
    }
    if (!/[A-Z]/.test(password)) {
      return '密码必须包含至少一个大写字母';
    }
    if (!/[a-z]/.test(password)) {
      return '密码必须包含至少一个小写字母';
    }
    if (!/[0-9]/.test(password)) {
      return '密码必须包含至少一个数字';
    }
    return null;
  }

  function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, '').trim();
  }

  router.get('/api/captcha', (req, res) => {
    const captcha = svgCaptcha.create({
      size: 4,
      width: 120,
      height: 40,
      noise: 3,
      color: true,
      ignoreChars: '0OoIl1'
    });

    const captchaKey = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    captchaStore.set(captchaKey, { text: captcha.text.toLowerCase(), createdAt: Date.now() });

    res.type('svg').setHeader('X-Captcha-Key', captchaKey).send(captcha.data);
  });

  function verifyCaptcha(req, res) {
    const { captcha, captchaKey } = req.body;
    if (!captcha || !captchaKey) {
      return res.status(400).json({ message: '请输入验证码' });
    }

    const stored = captchaStore.get(captchaKey);
    if (!stored) {
      return res.status(400).json({ message: '验证码已过期，请刷新' });
    }

    if (Date.now() - stored.createdAt > 5 * 60 * 1000) {
      captchaStore.delete(captchaKey);
      return res.status(400).json({ message: '验证码已过期，请刷新' });
    }

    if (stored.text !== captcha.toLowerCase()) {
      captchaStore.delete(captchaKey);
      return res.status(400).json({ message: '验证码错误' });
    }

    captchaStore.delete(captchaKey);
    return null;
  }

  router.post('/api/auth/register', async (req, res) => {
    let { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }

    username = sanitizeInput(username);
    email = email ? sanitizeInput(email) : null;

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: '用户名长度必须在3-20个字符之间' });
    }

    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return res.status(400).json({ message: '用户名只能包含字母、数字、下划线和中文' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    try {
      await withConn(async (conn) => {
        const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
          return res.status(400).json({ message: '用户名已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);


        const [result] = await conn.query(`
          INSERT INTO users (username, password, email, role, status)
          VALUES (?, ?, ?, 'user', 'active')
        `, [username, hashedPassword, email]);

        const token = jwt.sign({ id: result.insertId, username, role: 'user' }, jwtSecret, { expiresIn: '7d' });

        await logOperation(req, '注册', 'user', result.insertId, { username });

        res.status(201).json({
          token,
          user: { id: result.insertId, username, role: 'user', email }
        });
      });
    } catch (error) {
      res.status(500).json({ message: '注册失败' });
    }
  });

  router.post('/api/auth/login', async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }

    username = sanitizeInput(username);
    const clientIp = getClientIp(req);
    const attemptKey = `user:${clientIp}:${username}`;
    const attempts = loginAttempts.get(attemptKey) || { count: 0, lockedUntil: 0 };

    if (Date.now() < attempts.lockedUntil) {
      const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ message: `账号已被锁定，请 ${remaining} 分钟后再试` });
    }

    try {
      const users = await withConn(async (conn) => {
        const [users] = await conn.query('SELECT * FROM users WHERE username = ? AND status = "active"', [username]);
        return users;
      });

      if (users.length === 0) {
        attempts.count++;
        if (attempts.count >= loginAttemptLimit) {
          attempts.lockedUntil = Date.now() + loginLockoutDuration;
        }
        loginAttempts.set(attemptKey, attempts);
        return res.status(401).json({ message: '用户名或密码错误' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        attempts.count++;
        if (attempts.count >= loginAttemptLimit) {
          attempts.lockedUntil = Date.now() + loginLockoutDuration;
        }
        loginAttempts.set(attemptKey, attempts);
        const remainingAttempts = loginAttemptLimit - attempts.count;
        if (remainingAttempts > 0) {
          return res.status(401).json({ message: `密码错误，还剩 ${remainingAttempts} 次尝试机会` });
        } else {
          return res.status(401).json({ message: '密码错误，账号已被锁定，请稍后重试' });
        }
      }

      loginAttempts.delete(attemptKey);

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '7d' });

      await logOperation(req, '登录', 'user', user.id, { username });

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, email: user.email, avatar: user.avatar }
      });
    } catch (error) {
      res.status(500).json({ message: '登录失败' });
    }
  });

  router.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const users = await withConn(async (conn) => {
        const [users] = await conn.query('SELECT id, username, email, avatar, role, status FROM users WHERE id = ?', [req.user.id]);
        return users;
      });

      if (users.length === 0) {
        return res.status(404).json({ message: '用户不存在' });
      }

      res.json(users[0]);
    } catch (error) {
      res.status(500).json({ message: '获取用户信息失败' });
    }
  });

  // 上传用户头像
  router.post('/api/auth/avatar', authMiddleware, async (req, res) => {
    const multer = require('multer');
    const crypto = require('crypto');
    const path = require('path');
    const fs = require('fs');

    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
    fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `avatar_${req.user.id}_${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, name);
      }
    });

    const upload = multer({
      storage,
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('只支持图片文件'));
      }
    });

    upload.single('avatar')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || '上传失败' });
      }

      if (!req.file) {
        return res.status(400).json({ message: '请选择图片文件' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      try {
        await withConn(async (conn) => {
          const [old] = await conn.query('SELECT avatar FROM users WHERE id = ?', [req.user.id]);
          if (old.length > 0 && old[0].avatar && old[0].avatar.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(__dirname, '..', 'public', old[0].avatar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          await conn.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.id]);
        });

        res.json({ ok: true, avatar: avatarUrl, message: '头像上传成功' });
      } catch (error) {
        res.status(500).json({ message: '保存头像失败' });
      }
    });
  });

  router.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '请输入旧密码和新密码' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ message: '新密码不能与旧密码相同' });
    }

    try {
      await withConn(async (conn) => {
        const [users] = await conn.query('SELECT password FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
          return res.status(404).json({ message: '用户不存在' });
        }

        const isValid = await bcrypt.compare(oldPassword, users[0].password);
        if (!isValid) {
          return res.status(401).json({ message: '旧密码错误' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        await logOperation(req, '修改密码', 'user', req.user.id);

        res.json({ ok: true, message: '密码修改成功' });
      });
    } catch (error) {
      res.status(500).json({ message: '修改密码失败' });
    }
  });

  router.post('/api/admin/login', async (req, res) => {
    const { username, password, captcha, captchaKey } = req.body;
    const clientIp = getClientIp(req);

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }

    const captchaError = verifyCaptcha(req, res);
    if (captchaError) return captchaError;

    const attemptKey = `${clientIp}:${username}`;
    const attempts = loginAttempts.get(attemptKey) || { count: 0, lockedUntil: 0 };

    if (Date.now() < attempts.lockedUntil) {
      const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ message: `账号已被锁定，请 ${remaining} 分钟后再试` });
    }

    try {
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`SELECT * FROM users WHERE username = ? AND status = 'active'`, [username]);
        return rows;
      });

      if (rows.length === 0) {
        attempts.count++;
        if (attempts.count >= loginAttemptLimit) {
          attempts.lockedUntil = Date.now() + loginLockoutDuration;
        }
        loginAttempts.set(attemptKey, attempts);
        return res.status(401).json({ message: '账号不存在或已被禁用' });
      }

      const user = rows[0];

      if (!await bcrypt.compare(password, user.password)) {
        attempts.count++;
        if (attempts.count >= loginAttemptLimit) {
          attempts.lockedUntil = Date.now() + loginLockoutDuration;
        }
        loginAttempts.set(attemptKey, attempts);
        const remainingAttempts = loginAttemptLimit - attempts.count;
        if (remainingAttempts > 0) {
          return res.status(401).json({ message: `密码错误，还剩 ${remainingAttempts} 次尝试机会` });
        } else {
          return res.status(401).json({ message: '密码错误，账号已被锁定，请稍后重试' });
        }
      }

      loginAttempts.delete(attemptKey);

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '8h' });

      await logOperation({ user }, '管理员登录', 'user', user.id, { username });

      res.json({ ok: true, token, username: user.username, role: user.role });
    } catch (error) {
      res.status(500).json({ message: '登录失败' });
    }
  });

  router.get('/api/admin/me', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
  });

  router.get('/api/users/current', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const users = await withConn(async (conn) => {
        const [users] = await conn.query('SELECT id, username, email, avatar, role, status FROM users WHERE id = ?', [decoded.id]);
        return users;
      });
      if (users.length === 0) {
        return res.status(401).json({ message: '用户不存在' });
      }
      res.json(users[0]);
    } catch {
      return res.status(401).json({ message: '无效token' });
    }
  });

  router.post('/api/admin/logout', authMiddleware, async (req, res) => {
    await logOperation(req, '退出登录', 'user', req.user.id);
    res.json({ ok: true });
  });

  return router;
};

module.exports = createAuthRoutes;
