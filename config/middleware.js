const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/logger');

const jwtSecret = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const rawToken = req.headers['authorization'];
  if (!rawToken) {
    return res.status(401).json({ message: '请先登录' });
  }

  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: '登录已过期' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '权限不足' });
  }
  next();
}

function editorMiddleware(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ message: '权限不足' });
  }
  next();
}

async function logOperation(req, action, resourceType, resourceId, details = {}) {
  const { pool } = require('./database');
  let conn;
  try {
    conn = await pool.getConnection();
    const userId = req.user?.id || null;
    const username = req.user?.username || '未知';
    const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await conn.query(`
      INSERT INTO operation_logs (user_id, username, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, username, action, resourceType, resourceId, JSON.stringify(details), ip]);
  } catch (error) {
    logger.error('记录操作日志失败:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { authMiddleware, adminMiddleware, editorMiddleware, logOperation };
