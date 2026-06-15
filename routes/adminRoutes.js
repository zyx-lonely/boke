const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const XLSX = require('xlsx');

const createAdminRoutes = (pool, authMiddleware, adminMiddleware, logOperation) => {
  const router = express.Router();

  async function withConn(fn) {
    const conn = await pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      conn.release();
    }
  }

  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const crypto = require('crypto');
      const ext = path.extname(file.originalname);
      const name = crypto.randomBytes(16).toString('hex') + ext;
      cb(null, name);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('只支持图片文件'));
    }
  });

  router.get('/api/admin/logs', authMiddleware, adminMiddleware, async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const username = String(req.query.username || '');
    const action = String(req.query.action || '');
    const resourceType = String(req.query.resource_type || '');
    const startDate = String(req.query.start_date || '');
    const endDate = String(req.query.end_date || '');

    try {
      const { items, total } = await withConn(async (conn) => {
        let whereConditions = [];
        let params = [];

        if (username) {
          whereConditions.push('username LIKE ?');
          params.push(`%${username}%`);
        }
        if (action) {
          whereConditions.push('action LIKE ?');
          params.push(`%${action}%`);
        }
        if (resourceType) {
          whereConditions.push('resource_type = ?');
          params.push(resourceType);
        }
        if (startDate) {
          whereConditions.push('created_at >= ?');
          params.push(startDate);
        }
        if (endDate) {
          whereConditions.push('created_at <= ?');
          params.push(endDate + ' 23:59:59');
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const [rows] = await conn.query(
          `SELECT * FROM operation_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );

        const [countRows] = await conn.query(
          `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`,
          params
        );

        return { items: rows, total: countRows[0].total };
      });

      res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      res.status(500).json({ message: '获取操作日志失败' });
    }
  });

  router.get('/api/admin/logs/export', authMiddleware, adminMiddleware, async (req, res) => {
    const format = req.query.format || 'csv';
    const username = String(req.query.username || '');
    const action = String(req.query.action || '');
    const resourceType = String(req.query.resource_type || '');
    const startDate = String(req.query.start_date || '');
    const endDate = String(req.query.end_date || '');

    try {
      const rows = await withConn(async (conn) => {
        let whereConditions = [];
        let params = [];

        if (username) {
          whereConditions.push('username LIKE ?');
          params.push(`%${username}%`);
        }
        if (action) {
          whereConditions.push('action LIKE ?');
          params.push(`%${action}%`);
        }
        if (resourceType) {
          whereConditions.push('resource_type = ?');
          params.push(resourceType);
        }
        if (startDate) {
          whereConditions.push('created_at >= ?');
          params.push(startDate);
        }
        if (endDate) {
          whereConditions.push('created_at <= ?');
          params.push(endDate + ' 23:59:59');
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const [result] = await conn.query(
          `SELECT * FROM operation_logs ${whereClause} ORDER BY created_at DESC`,
          params
        );
        return result;
      });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.json`);
        res.json(rows);
      } else if (format === 'xlsx' || format === 'excel') {
        const worksheetData = [
          ['ID', '操作人', '操作类型', '目标类型', '目标ID', '详情', 'IP地址', '操作时间']
        ];

        for (const row of rows) {
          worksheetData.push([
            row.id,
            row.username || '',
            row.action || '',
            row.resource_type || '',
            row.resource_id || '',
            row.details || '',
            row.ip_address || '',
            row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : ''
          ]);
        }

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        worksheet['!cols'] = [
          { wch: 8 },   // ID
          { wch: 15 },  // 操作人
          { wch: 20 },  // 操作类型
          { wch: 12 },  // 目标类型
          { wch: 10 },  // 目标ID
          { wch: 40 },  // 详情
          { wch: 15 },  // IP地址
          { wch: 22 }   // 操作时间
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, '操作日志');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
      } else {
        const headers = ['ID', '操作人', '操作类型', '目标类型', '目标ID', '详情', 'IP地址', '操作时间'];
        const csvRows = [headers.join(',')];

        for (const row of rows) {
          const values = [
            row.id,
            `"${(row.username || '').replace(/"/g, '""')}"`,
            `"${(row.action || '').replace(/"/g, '""')}"`,
            `"${(row.resource_type || '').replace(/"/g, '""')}"`,
            row.resource_id || '',
            `"${(row.details || '').replace(/"/g, '""')}"`,
            `"${(row.ip_address || '').replace(/"/g, '""')}"`,
            `"${row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : ''}"`
          ];
          csvRows.push(values.join(','));
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csvRows.join('\n'));
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      res.status(500).json({ message: '导出日志失败' });
    }
  });

  router.delete('/api/admin/logs/clean', authMiddleware, adminMiddleware, async (req, res) => {
    const days = Number(req.query.days) || 30;

    try {
      const result = await withConn(async (conn) => {
        const [countResult] = await conn.query(
          `SELECT COUNT(*) as count FROM operation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [days]
        );
        const count = countResult[0].count;

        if (count === 0) {
          return { deleted: 0, message: `没有超过 ${days} 天的旧日志` };
        }

        await conn.query(
          `DELETE FROM operation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [days]
        );

        return { deleted: count, message: `已清理 ${count} 条超过 ${days} 天的旧日志` };
      });

      res.json(result);
    } catch (error) {
      console.error('清理日志失败:', error);
      res.status(500).json({ message: '清理日志失败' });
    }
  });

  router.get('/api/admin/logs/count', authMiddleware, adminMiddleware, async (req, res) => {
    const days = Number(req.query.days) || 30;

    try {
      const result = await withConn(async (conn) => {
        const [countResult] = await conn.query(
          `SELECT COUNT(*) as count FROM operation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [days]
        );
        const [totalResult] = await conn.query(`SELECT COUNT(*) as total FROM operation_logs`);
        return {
          oldCount: countResult[0].count,
          total: totalResult[0].total,
          days
        };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: '获取日志统计失败' });
    }
  });

  router.get('/api/admin/backup', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { resources, users, comments, favorites } = await withConn(async (conn) => {
        const [resources] = await conn.query(`SELECT * FROM resources`);
        const [users] = await conn.query(`SELECT id, username, email, role, status, created_at, updated_at FROM users`);
        const [comments] = await conn.query(`SELECT * FROM comments`);
        const [favorites] = await conn.query(`SELECT * FROM favorites`);

        return { resources, users, comments, favorites };
      });

      const backup = {
        timestamp: new Date().toISOString(),
        resources,
        users,
        comments,
        favorites
      };

      const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
      res.status(500).json({ message: '备份失败' });
    }
  });

  router.post('/api/admin/upload', authMiddleware, adminMiddleware, upload.array('images', 10), (req, res) => {
    const results = (req.files || []).map(file => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      originalName: file.originalname
    }));
    res.json({ success: true, files: results });
  });

  router.get('/api/docs', (req, res) => {
    const docs = {
      title: '资源分享博客 API',
      version: '1.0.0',
      endpoints: [
        { method: 'GET', path: '/api/resources', description: '获取资源列表', params: ['q', 'tag', 'category', 'page', 'limit'] },
        { method: 'GET', path: '/api/resources/:id', description: '获取资源详情' },
        { method: 'POST', path: '/api/resources/:id/hits', description: '增加浏览量' },
        { method: 'GET', path: '/api/tags', description: '获取所有标签' },
        { method: 'GET', path: '/api/categories', description: '获取所有分类' },
        { method: 'GET', path: '/api/hot', description: '获取热门资源' },
        { method: 'GET', path: '/api/recent', description: '获取最新资源' },
        { method: 'POST', path: '/api/admin/login', description: '管理员登录', body: ['username', 'password', 'captcha'] },
        { method: 'GET', path: '/api/admin/me', description: '获取当前用户信息', auth: true },
        { method: 'GET', path: '/api/admin/resources', description: '后台获取资源列表', auth: true },
        { method: 'POST', path: '/api/admin/resources', description: '创建资源', auth: true },
        { method: 'PUT', path: '/api/admin/resources/:id', description: '更新资源', auth: true },
        { method: 'DELETE', path: '/api/admin/resources/:id', description: '删除资源', auth: true },
        { method: 'GET', path: '/api/resources/:id/comments', description: '获取评论列表' },
        { method: 'POST', path: '/api/resources/:id/comments', description: '添加评论', body: ['username', 'email', 'content', 'parent_id'] },
        { method: 'POST', path: '/api/resources/:id/favorite', description: '收藏/取消收藏', body: ['username'] },
        { method: 'GET', path: '/api/captcha', description: '获取验证码' }
      ]
    };
    res.json(docs);
  });

  return router;
};

module.exports = createAdminRoutes;
