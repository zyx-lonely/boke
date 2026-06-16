const express = require('express');
const { withConn } = require('../config/database');

const createCategoryRoutes = (authMiddleware, adminMiddleware, logOperation, getCachedData, setCachedData, clearCache) => {
  const router = express.Router();

  router.get('/api/categories', async (req, res) => {
    try {
      const cachedCategories = getCachedData('categories');
      if (cachedCategories) {
        res.json(cachedCategories);
        return;
      }

      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`SELECT id, name, icon FROM categories WHERE status = 'active' ORDER BY sort_order, name`);
        return result;
      });
      
      setCachedData('categories', rows);
      res.json(rows);
    } catch (error) {
      console.error('获取分类失败:', error);
      res.status(500).json({ message: '获取分类失败' });
    }
  });

  router.get('/api/admin/categories', authMiddleware, async (req, res) => {
    try {
      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`
          SELECT c.id, c.name, c.description, c.icon, c.sort_order, c.status, COUNT(r.id) as resource_count
          FROM categories c
          LEFT JOIN resources r ON c.id = r.category_id
          GROUP BY c.id
          ORDER BY c.sort_order, c.name
        `);
        return result;
      });
      
      res.json(rows);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      res.status(500).json({ message: '获取分类列表失败' });
    }
  });

  router.post('/api/admin/categories', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, description, icon, sort_order } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: '分类名称不能为空' });
      }
      
      await withConn(async (conn) => {
        const [existing] = await conn.query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
        if (existing.length > 0) {
          return res.status(400).json({ message: '分类已存在' });
        }
        
        const [result] = await conn.query(`INSERT INTO categories (name, description, icon, sort_order) VALUES (?, ?, ?, ?)`, [name.trim(), description || '', icon || '', sort_order || 0]);
        
        clearCache('categories');
        await logOperation(req, '创建分类', 'category', result.insertId, { name });
        
        res.json({ ok: true, message: '分类创建成功' });
      });
    } catch (error) {
      console.error('创建分类失败:', error);
      res.status(500).json({ message: '创建分类失败' });
    }
  });

  router.get('/api/admin/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        return rows;
      });
      if (result.length === 0) {
        return res.status(404).json({ message: '分类不存在' });
      }
      res.json(result[0]);
    } catch (error) {
      console.error('获取分类失败:', error);
      res.status(500).json({ message: '获取分类失败' });
    }
  });

  router.put('/api/admin/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, description, icon, sort_order, status } = req.body;
      
      await withConn(async (conn) => {
        const [checkRows] = await conn.query('SELECT id FROM categories WHERE id = ?', [req.params.id]);
        if (checkRows.length === 0) {
          return res.status(404).json({ message: '分类不存在' });
        }
        
        const updates = [];
        const values = [];
        if (name) { updates.push('name = ?'); values.push(name.trim()); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
        if (status) { updates.push('status = ?'); values.push(status); }
        
        if (updates.length > 0) {
          values.push(req.params.id);
          await conn.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        
        clearCache('categories');
        await logOperation(req, '更新分类', 'category', req.params.id, { name });
        
        res.json({ ok: true, message: '分类更新成功' });
      });
    } catch (error) {
      console.error('更新分类失败:', error);
      res.status(500).json({ message: '更新分类失败' });
    }
  });

  router.delete('/api/admin/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await withConn(async (conn) => {
        const [count] = await conn.query('SELECT COUNT(*) as count FROM resources WHERE category_id = ?', [req.params.id]);
        
        if (count[0].count > 0) {
          return res.status(400).json({ message: '该分类下存在资源，无法删除' });
        }
        
        await conn.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        
        clearCache('categories');
        await logOperation(req, '删除分类', 'category', req.params.id);
        
        res.json({ ok: true, message: '分类删除成功' });
      });
    } catch (error) {
      console.error('删除分类失败:', error);
      res.status(500).json({ message: '删除分类失败' });
    }
  });

  return router;
};

module.exports = createCategoryRoutes;
