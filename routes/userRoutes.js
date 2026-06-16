  const express = require('express');
const bcrypt = require('bcrypt');
const { withConn } = require('../config/database');

const ALLOWED_ROLES = ['admin', 'editor', 'user'];
const ALLOWED_STATUSES = ['active', 'disabled'];

const createUserRoutes = (authMiddleware, adminMiddleware, logOperation) => {
  const router = express.Router();

  router.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`SELECT id, username, email, avatar, role, status, created_at FROM users ORDER BY created_at DESC`);
        return result;
      });
      res.json(rows);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      res.status(500).json({ message: '获取用户列表失败' });
    }
  });

  router.post('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    const { username, password, email, role = 'editor' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: `角色必须是以下之一: ${ALLOWED_ROLES.join(', ')}` });
    }

    try {
      const result = await withConn(async (conn) => {
        const [existing] = await conn.query(`SELECT id FROM users WHERE username = ?`, [username]);
        if (existing.length > 0) {
          return { exists: true };
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await conn.query(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`, [username, hashedPassword, email, role]);

        await logOperation(req, '创建用户', 'user', result.insertId, { username, role });
        
        return { exists: false, id: result.insertId, username, email, role };
      });

      if (result.exists) {
        return res.status(400).json({ message: '用户名已存在' });
      }
      res.status(201).json({ id: result.id, username: result.username, email: result.email, role: result.role });
    } catch (error) {
      console.error('创建用户失败:', error);
      res.status(500).json({ message: '创建用户失败' });
    }
  });

  router.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { username, email, role, status, password } = req.body;

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: `角色必须是以下之一: ${ALLOWED_ROLES.join(', ')}` });
    }
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: `状态必须是以下之一: ${ALLOWED_STATUSES.join(', ')}` });
    }
    
    try {
      const result = await withConn(async (conn) => {
        const [existing] = await conn.query(`SELECT id FROM users WHERE id = ?`, [req.params.id]);
        if (existing.length === 0) {
          return { notFound: true };
        }

        const updates = [];
        const values = [];
        if (username) { updates.push('username = ?'); values.push(username); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
        if (role) { updates.push('role = ?'); values.push(role); }
        if (status) { updates.push('status = ?'); values.push(status); }
        if (password) {
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash(password, 12);
          updates.push('password = ?'); 
          values.push(hashedPassword);
        }

        if (updates.length > 0) {
          values.push(req.params.id);
          await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await conn.query(`SELECT id, username, email, avatar, role, status FROM users WHERE id = ?`, [req.params.id]);

        await logOperation(req, '更新用户', 'user', req.params.id, { username, email, role, status });
        
        return { notFound: false, user: rows[0] };
      });

      if (result.notFound) {
        return res.status(404).json({ message: '用户不存在' });
      }
      res.json(result.user);
    } catch (error) {
      console.error('更新用户失败:', error);
      res.status(500).json({ message: '更新用户失败' });
    }
  });

  router.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: '不能删除自己' });
    }

    try {
      const result = await withConn(async (conn) => {
        const [result] = await conn.query(`DELETE FROM users WHERE id = ?`, [parseInt(req.params.id)]);
        return result;
      });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '用户不存在' });
      }

      await logOperation(req, '删除用户', 'user', req.params.id);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('删除用户失败:', error);
      res.status(500).json({ message: '删除用户失败' });
    }
  });

  router.post('/api/admin/users/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: '新密码不能为空' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: '密码长度至少8位' });
    }

    try {
      await withConn(async (conn) => {
          const hashedPassword = await bcrypt.hash(newPassword, 12);
        await conn.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, req.params.id]);
      });

      await logOperation(req, '重置密码', 'user', req.params.id);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('重置密码失败:', error);
      res.status(500).json({ message: '重置密码失败' });
    }
  });

  return router;
};

module.exports = createUserRoutes;
