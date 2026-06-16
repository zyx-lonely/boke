const express = require('express');
const { withConn } = require('../config/database');

const createTagRoutes = (authMiddleware, adminMiddleware, editorMiddleware, logOperation, getCachedData, setCachedData, clearCache) => {
  const router = express.Router();

  router.get('/api/tags', async (req, res) => {
    try {
      const cached = getCachedData('tags:all');
      if (cached) return res.json(cached);

      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT t.id, t.name, COUNT(rt.resource_id) as resource_count
          FROM tags t
          LEFT JOIN resource_tags rt ON t.id = rt.tag_id
          LEFT JOIN resources r ON rt.resource_id = r.id AND r.status = 'approved'
          GROUP BY t.id, t.name
          ORDER BY resource_count DESC, t.name
        `);
        return rows;
      });
      setCachedData('tags:all', rows);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: '获取标签失败' });
    }
  });

  router.get('/api/resources/:id/tags', async (req, res) => {
    try {
      const cacheKey = `resource_tags:${req.params.id}`;
      const cached = getCachedData(cacheKey);
      if (cached) return res.json(cached);

      const rows = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT t.id, t.name
          FROM tags t
          JOIN resource_tags rt ON t.id = rt.tag_id
          WHERE rt.resource_id = ?
        `, [req.params.id]);
        return rows;
      });
      setCachedData(cacheKey, rows);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: '获取资源标签失败' });
    }
  });

  router.post('/api/resources/:id/tags', authMiddleware, editorMiddleware, async (req, res) => {
    const { tag_ids } = req.body;

    if (!Array.isArray(tag_ids)) {
      return res.status(400).json({ message: 'tag_ids 必须是数组' });
    }

    try {
      const result = await withConn(async (conn) => {
        const [checkRows] = await conn.query('SELECT id FROM resources WHERE id = ?', [req.params.id]);
        if (checkRows.length === 0) {
          return { notFound: true };
        }

        await conn.query('DELETE FROM resource_tags WHERE resource_id = ?', [req.params.id]);

        if (tag_ids.length > 0) {
          const values = tag_ids.map(tagId => [req.params.id, tagId]);
          await conn.query('INSERT INTO resource_tags (resource_id, tag_id) VALUES ?', [values]);
        }

        return { notFound: false };
      });

      if (result.notFound) {
        return res.status(404).json({ message: '资源不存在' });
      }

      clearCache('tags:all');
      clearCache(`resource_tags:${req.params.id}`);

      await logOperation(req, '更新资源标签', 'resource', req.params.id, { tag_ids });

      res.json({ ok: true, message: '标签更新成功' });
    } catch (error) {
      res.status(500).json({ message: '更新资源标签失败' });
    }
  });

  router.post('/api/admin/tags', authMiddleware, adminMiddleware, async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '标签名称不能为空' });
    }

    const tagName = name.trim();

    try {
      const result = await withConn(async (conn) => {
        const [existing] = await conn.query('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (existing.length > 0) {
          return { exists: true };
        }

        const [result] = await conn.query('INSERT INTO tags (name) VALUES (?)', [tagName]);
        return { exists: false, insertId: result.insertId };
      });

      if (result.exists) {
        return res.status(400).json({ message: '标签已存在' });
      }

      clearCache('tags:all');

      await logOperation(req, '创建标签', 'tag', result.insertId, { name: tagName });

      res.status(201).json({ id: result.insertId, name: tagName });
    } catch (error) {
      res.status(500).json({ message: '创建标签失败' });
    }
  });

  router.put('/api/admin/tags/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '标签名称不能为空' });
    }

    try {
      const result = await withConn(async (conn) => {
        const [checkRows] = await conn.query('SELECT id FROM tags WHERE id = ?', [req.params.id]);
        if (checkRows.length === 0) {
          return { notFound: true };
        }

        const [existing] = await conn.query('SELECT id FROM tags WHERE name = ? AND id != ?', [name.trim(), req.params.id]);
        if (existing.length > 0) {
          return { exists: true };
        }

        await conn.query('UPDATE tags SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
        return { notFound: false, exists: false };
      });

      if (result.notFound) {
        return res.status(404).json({ message: '标签不存在' });
      }
      if (result.exists) {
        return res.status(400).json({ message: '标签名称已存在' });
      }

      clearCache('tags:all');

      await logOperation(req, '更新标签', 'tag', req.params.id, { name: name.trim() });

      res.json({ ok: true, message: '标签更新成功' });
    } catch (error) {
      res.status(500).json({ message: '更新标签失败' });
    }
  });

  router.delete('/api/admin/tags/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const result = await withConn(async (conn) => {
        const [checkRows] = await conn.query('SELECT id FROM tags WHERE id = ?', [req.params.id]);
        if (checkRows.length === 0) {
          return { notFound: true };
        }

        await conn.query('DELETE FROM resource_tags WHERE tag_id = ?', [req.params.id]);
        await conn.query('DELETE FROM tags WHERE id = ?', [req.params.id]);
        return { notFound: false };
      });

      if (result.notFound) {
        return res.status(404).json({ message: '标签不存在' });
      }

      clearCache('tags:all');

      await logOperation(req, '删除标签', 'tag', req.params.id);

      res.json({ ok: true, message: '标签删除成功' });
    } catch (error) {
      res.status(500).json({ message: '删除标签失败' });
    }
  });

  router.post('/api/admin/tags/batch', authMiddleware, adminMiddleware, async (req, res) => {
    const { names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ message: '请提供标签名称数组' });
    }

    try {
      const { created, skipped } = await withConn(async (conn) => {
        const created = [];
        const skipped = [];

        for (const name of names) {
          const tagName = name.trim();
          if (!tagName) continue;

          const [existing] = await conn.query('SELECT id FROM tags WHERE name = ?', [tagName]);
          if (existing.length > 0) {
            skipped.push(tagName);
            continue;
          }

          const [result] = await conn.query('INSERT INTO tags (name) VALUES (?)', [tagName]);
          created.push({ id: result.insertId, name: tagName });
        }

        return { created, skipped };
      });

      clearCache('tags:all');

      await logOperation(req, '批量创建标签', 'tag', null, { created: created.length, skipped: skipped.length });

      res.json({ ok: true, created, skipped });
    } catch (error) {
      res.status(500).json({ message: '批量创建标签失败' });
    }
  });

  return router;
};

module.exports = createTagRoutes;
