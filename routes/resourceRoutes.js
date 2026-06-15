const express = require('express');

const { withConn } = require('../config/database');

const parseRow = (row) => {
  return {
    ...row,
    cloud_drives: typeof row.cloud_drives === 'string' ? (() => {
      try { return JSON.parse(row.cloud_drives); } catch { return []; }
    })() : (row.cloud_drives || [])
  };
};

const createResourceRoutes = (pool, authMiddleware, editorMiddleware, logOperation, getCachedData, setCachedData, clearCache) => {
  const router = express.Router();

  router.get('/api/resources', async (req, res) => {
    try {
      const q = String(req.query.q || '').toLowerCase();
      const category_id = Number(req.query.category_id) || null;
      const category_name = req.query.category_name || req.query.category || null;
      const tag = req.query.tag || null;
      const tag_id = Number(req.query.tag_id) || null;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      let where = `r.status = 'approved'`;
      let params = [];

      if (q) {
        where += ` AND (LOWER(r.title) LIKE ? OR LOWER(r.software_name) LIKE ? OR LOWER(r.summary) LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (category_id) {
        where += ` AND r.category_id = ?`;
        params.push(category_id);
      } else if (category_name) {
        where += ` AND c.name = ?`;
        params.push(category_name);
      }
      if (tag_id) {
        where += ` AND EXISTS (SELECT 1 FROM resource_tags rt WHERE rt.resource_id = r.id AND rt.tag_id = ?)`;
        params.push(tag_id);
      } else if (tag) {
        where += ` AND EXISTS (SELECT 1 FROM resource_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.resource_id = r.id AND t.name = ?)`;
        params.push(tag);
      }

      const result = await withConn(async (conn) => {
        const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM resources r LEFT JOIN categories c ON r.category_id = c.id WHERE ${where}`, params);
        const total = countRows[0].total;

        const [rows] = await conn.query(`
          SELECT r.*, c.name as category_name, c.icon as category_icon 
          FROM resources r 
          LEFT JOIN categories c ON r.category_id = c.id 
          WHERE ${where} 
          ORDER BY r.pinned DESC, r.updated_at DESC, r.id DESC 
          LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const resourceIds = rows.map(r => r.id);
        let tagsMap = {};
        if (resourceIds.length > 0) {
          const [allTags] = await conn.query(`
            SELECT rt.resource_id, t.name 
            FROM resource_tags rt 
            JOIN tags t ON rt.tag_id = t.id 
            WHERE rt.resource_id IN (?)
          `, [resourceIds]);
          allTags.forEach(rt => {
            if (!tagsMap[rt.resource_id]) tagsMap[rt.resource_id] = [];
            tagsMap[rt.resource_id].push(rt.name);
          });
        }

        const items = rows.map(row => {
          const resource = parseRow(row);
          resource.tags = tagsMap[row.id] || [];
          return resource;
        });

        return { items, total };
      });

      res.json({ items: result.items, total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) {
      console.error('获取资源列表失败:', error);
      res.status(500).json({ message: '获取资源列表失败' });
    }
  });

  router.get('/api/resources/hot', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const cacheKey = `hot:${limit}`;
      const cached = getCachedData(cacheKey);
      if (cached) return res.json(cached);

      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.*, c.name as category_name 
          FROM resources r 
          LEFT JOIN categories c ON r.category_id = c.id 
          WHERE r.status = 'approved'
          ORDER BY r.hits DESC 
          LIMIT ?
        `, [limit]);
        return rows;
      });
      setCachedData(cacheKey, rows);
      res.json(rows);
    } catch (error) {
      console.error('获取热门资源失败:', error);
      res.status(500).json({ message: '获取热门资源失败' });
    }
  });

  router.get('/api/resources/newest', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const cacheKey = `newest:${limit}`;
      const cached = getCachedData(cacheKey);
      if (cached) return res.json(cached);

      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.*, c.name as category_name 
          FROM resources r 
          LEFT JOIN categories c ON r.category_id = c.id 
          WHERE r.status = 'approved'
          ORDER BY r.created_at DESC 
          LIMIT ?
        `, [limit]);
        return rows;
      });
      setCachedData(cacheKey, rows);
      res.json(rows);
    } catch (error) {
      console.error('获取最新资源失败:', error);
      res.status(500).json({ message: '获取最新资源失败' });
    }
  });

  router.get('/api/resources/recommend', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.*, c.name as category_name, c.icon as category_icon 
          FROM resources r 
          LEFT JOIN categories c ON r.category_id = c.id 
          WHERE r.status = 'approved'
          ORDER BY r.hits DESC, r.created_at DESC 
          LIMIT ?
        `, [limit]);
        return rows;
      });
      res.json(rows);
    } catch (error) {
      console.error('获取推荐资源失败:', error);
      res.status(500).json({ message: '获取推荐资源失败' });
    }
  });

  router.get('/api/resources/:id', async (req, res) => {
    try {
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query(`SELECT r.*, c.name as category_name, c.icon as category_icon FROM resources r LEFT JOIN categories c ON r.category_id = c.id WHERE r.id = ?`, [req.params.id]);
        if (rows.length === 0) return null;

        const [tags] = await conn.query(`
          SELECT t.id, t.name 
          FROM tags t 
          JOIN resource_tags rt ON t.id = rt.tag_id 
          WHERE rt.resource_id = ?
        `, [req.params.id]);

        const resource = parseRow(rows[0]);
        resource.tags = tags.map(t => t.name);
        resource.tag_ids = tags.map(t => t.id);
        return resource;
      });

      if (!result) return res.status(404).json({ message: '资源不存在' });
      res.json(result);
    } catch (error) {
      console.error('获取资源详情失败:', error);
      res.status(500).json({ message: '获取资源详情失败' });
    }
  });

  const hitsRateLimit = new Map();
  
  router.post('/api/resources/:id/hits', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const resourceId = req.params.id;
    const key = `${ip}:${resourceId}`;
    const now = Date.now();
    const lastHit = hitsRateLimit.get(key) || 0;
    
    if (now - lastHit < 60000) {
      return res.status(429).json({ message: '请勿频繁刷新' });
    }
    
    hitsRateLimit.set(key, now);
    if (hitsRateLimit.size > 10000) {
      const oldest = hitsRateLimit.keys().next().value;
      hitsRateLimit.delete(oldest);
    }
    
    withConn(async (conn) => {
      await conn.query(`UPDATE resources SET hits = hits + 1 WHERE id = ?`, [resourceId]);
      const [rows] = await conn.query(`SELECT hits FROM resources WHERE id = ?`, [resourceId]);
      if (rows.length === 0) return res.status(404).json({ message: '资源不存在' });
      res.json({ hits: rows[0].hits });
    }).catch(error => {
      res.status(500).json({ message: '更新浏览量失败' });
    });
  });

  router.get('/api/admin/resources', authMiddleware, async (req, res) => {
    try {
      const q = String(req.query.q || '').toLowerCase();
      const status = String(req.query.status || '');
      const category_id = Number(req.query.category_id) || null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      let where = '1=1';
      let params = [];

      if (q) {
        where += ` AND (LOWER(title) LIKE ? OR LOWER(software_name) LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`);
      }
      
      if (status) {
        where += ` AND status = ?`;
        params.push(status);
      }
      
      if (category_id) {
        where += ` AND category_id = ?`;
        params.push(category_id);
      }

      const result = await withConn(async (conn) => {
        const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM resources WHERE ${where}`, params);
        const total = countRows[0].total;
        const [rows] = await conn.query(`SELECT r.*, c.name as category_name, c.icon as category_icon FROM resources r LEFT JOIN categories c ON r.category_id = c.id WHERE ${where} ORDER BY r.pinned DESC, r.updated_at DESC, r.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return { items: rows.map(parseRow), total };
      });

      res.json({ items: result.items, total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) {
      console.error('获取资源列表失败:', error);
      res.status(500).json({ message: '获取资源列表失败' });
    }
  });

  router.post('/api/admin/resources', authMiddleware, editorMiddleware, async (req, res) => {
    const { title, software_name, category_id, license, project_url, summary, content, cloud_drives, pinned, status = 'pending' } = req.body;
    
    if (!title || !summary) {
      return res.status(400).json({ message: '标题和简介不能为空' });
    }

    try {
      const result = await withConn(async (conn) => {
        const [result] = await conn.query(`
          INSERT INTO resources (title, software_name, category_id, license, project_url, summary, content, cloud_drives, pinned, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, software_name || null, category_id || null, license || null, project_url || null, summary, content || null, typeof cloud_drives === 'string' ? cloud_drives : JSON.stringify(cloud_drives || []), pinned || false, status]);
        return result.insertId;
      });
      clearCache('hot:10');
      clearCache('newest:10');

      await logOperation(req, '创建资源', 'resource', result, { title });
      
      res.status(201).json({ id: result, message: '资源创建成功' });
    } catch (error) {
      console.error('创建资源失败:', error);
      res.status(500).json({ message: '创建资源失败' });
    }
  });

  router.put('/api/admin/resources/:id', authMiddleware, editorMiddleware, async (req, res) => {
    const { title, software_name, category_id, license, project_url, summary, content, cloud_drives, pinned, status } = req.body;
    
    try {
      const found = await withConn(async (conn) => {
        const [checkRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [req.params.id]);
        if (checkRows.length === 0) return false;

        const updates = [];
        const values = [];
        if (title) { updates.push('title = ?'); values.push(title); }
        if (software_name !== undefined) { updates.push('software_name = ?'); values.push(software_name || null); }
        if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id || null); }
        if (license !== undefined) { updates.push('license = ?'); values.push(license || null); }
        if (project_url !== undefined) { updates.push('project_url = ?'); values.push(project_url || null); }
        if (summary) { updates.push('summary = ?'); values.push(summary); }
        if (content !== undefined) { updates.push('content = ?'); values.push(content || null); }
        if (cloud_drives !== undefined) { updates.push('cloud_drives = ?'); values.push(typeof cloud_drives === 'string' ? cloud_drives : JSON.stringify(cloud_drives)); }
        if (pinned !== undefined) { updates.push('pinned = ?'); values.push(Boolean(pinned)); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
          values.push(req.params.id);
          await conn.query(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        return true;
      });

      if (!found) return res.status(404).json({ message: '资源不存在' });
      clearCache('hot:10');
      clearCache('newest:10');
      await logOperation(req, '更新资源', 'resource', req.params.id, { title });
      
      res.json({ ok: true, message: '资源更新成功' });
    } catch (error) {
      console.error('更新资源失败:', error);
      res.status(500).json({ message: '更新资源失败' });
    }
  });

  router.delete('/api/admin/resources/:id', authMiddleware, editorMiddleware, async (req, res) => {
    try {
      const affected = await withConn(async (conn) => {
        const [result] = await conn.query(`DELETE FROM resources WHERE id = ?`, [req.params.id]);
        return result.affectedRows;
      });
      clearCache('hot:10');
      clearCache('newest:10');

      if (affected === 0) return res.status(404).json({ message: '资源不存在' });

      await logOperation(req, '删除资源', 'resource', req.params.id);
      res.json({ ok: true, message: '资源删除成功' });
    } catch (error) {
      console.error('删除资源失败:', error);
      res.status(500).json({ message: '删除资源失败' });
    }
  });

  router.put('/api/admin/resources/:id/pin', authMiddleware, editorMiddleware, async (req, res) => {
    const { pinned } = req.body;
    
    try {
      const found = await withConn(async (conn) => {
        const [checkRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [req.params.id]);
        if (checkRows.length === 0) return false;
        await conn.query(`UPDATE resources SET pinned = ? WHERE id = ?`, [Boolean(pinned), req.params.id]);
        return true;
      });

      if (!found) return res.status(404).json({ message: '资源不存在' });

      await logOperation(req, pinned ? '置顶资源' : '取消置顶', 'resource', req.params.id);
      res.json({ ok: true, message: pinned ? '资源已置顶' : '已取消置顶' });
    } catch (error) {
      console.error('更新置顶状态失败:', error);
      res.status(500).json({ message: '更新置顶状态失败' });
    }
  });

  router.put('/api/admin/resources/:id/status', authMiddleware, editorMiddleware, async (req, res) => {
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    try {
      const found = await withConn(async (conn) => {
        const [checkRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [req.params.id]);
        if (checkRows.length === 0) return false;
        await conn.query(`UPDATE resources SET status = ? WHERE id = ?`, [status, req.params.id]);
        return true;
      });

      if (!found) return res.status(404).json({ message: '资源不存在' });

      await logOperation(req, `设置状态为${status}`, 'resource', req.params.id);
      res.json({ ok: true, message: '状态更新成功' });
    } catch (error) {
      console.error('更新状态失败:', error);
      res.status(500).json({ message: '更新状态失败' });
    }
  });

  return router;
};

module.exports = createResourceRoutes;