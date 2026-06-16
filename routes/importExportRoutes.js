const express = require('express');
const { withConn } = require('../config/database');

const createImportExportRoutes = (authMiddleware, editorMiddleware, logOperation) => {
  const router = express.Router();

  function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        rows.push(row);
      }
    }
    return rows;
  }

  function toCSV(items) {
    if (!items.length) return '';
    
    const headers = ['title', 'software_name', 'category', 'license', 'project_url', 'summary', 'content', 'pinned'];
    const csvRows = [headers.join(',')];
    
    for (const item of items) {
      const values = headers.map(h => {
        const val = String(item[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  router.get('/api/admin/export/csv', authMiddleware, async (req, res) => {
    try {
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.title, r.software_name, c.name as category, r.license, 
                 r.project_url, r.summary, r.content, r.pinned,
                 r.cloud_drives, r.status, r.hits
          FROM resources r
          LEFT JOIN categories c ON r.category_id = c.id
          ORDER BY r.id DESC
        `);
        return rows;
      });

      const csv = toCSV(result);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=resources_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv);
    } catch (error) {
      console.error('导出CSV失败:', error);
      res.status(500).json({ message: '导出失败' });
    }
  });

  router.get('/api/admin/export/json', authMiddleware, async (req, res) => {
    try {
      const result = await withConn(async (conn) => {
        const [rows] = await conn.query(`
          SELECT r.*, c.name as category_name 
          FROM resources r
          LEFT JOIN categories c ON r.category_id = c.id
          ORDER BY r.id DESC
        `);
        return rows.map(row => ({
          ...row,
          cloud_drives: typeof row.cloud_drives === 'string' ? (() => {
            try { return JSON.parse(row.cloud_drives); } catch { return []; }
          })() : (row.cloud_drives || [])
        }));
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=resources_${new Date().toISOString().split('T')[0]}.json`);
      res.json(result);
    } catch (error) {
      console.error('导出JSON失败:', error);
      res.status(500).json({ message: '导出失败' });
    }
  });

  router.post('/api/admin/import/csv', authMiddleware, editorMiddleware, async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ message: '请提供CSV数据' });
      }

      const rows = parseCSV(csvData);
      if (rows.length === 0) {
        return res.status(400).json({ message: 'CSV数据为空或格式错误' });
      }

      const results = { success: 0, failed: 0, errors: [] };

      await withConn(async (conn) => {
        const [catRows] = await conn.query('SELECT id, name FROM categories');
        const categoryMap = new Map(catRows.map(c => [c.name, c.id]));

        for (const row of rows) {
          try {
            if (!row.title) {
              results.failed++;
              results.errors.push('标题不能为空');
              continue;
            }

            const categoryId = row.category ? categoryMap.get(row.category) : null;
            
            await conn.query(`
              INSERT INTO resources (title, software_name, category_id, license, project_url, summary, content, pinned, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `, [
              row.title,
              row.software_name || null,
              categoryId || null,
              row.license || null,
              row.project_url || null,
              row.summary || '',
              row.content || '',
              row.pinned === 'true' || row.pinned === '1'
            ]);
            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push(`导入失败: ${err.message}`);
          }
        }
      });

      await logOperation(req, '批量导入资源', 'resource', null, { count: results.success });

      res.json({
        message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
        ...results
      });
    } catch (error) {
      console.error('导入CSV失败:', error);
      res.status(500).json({ message: '导入失败' });
    }
  });

  router.post('/api/admin/import/json', authMiddleware, editorMiddleware, async (req, res) => {
    try {
      const { jsonData } = req.body;
      if (!jsonData || !Array.isArray(jsonData)) {
        return res.status(400).json({ message: '请提供JSON数组数据' });
      }

      const results = { success: 0, failed: 0, errors: [] };

      await withConn(async (conn) => {
        const [catRows] = await conn.query('SELECT id, name FROM categories');
        const categoryMap = new Map(catRows.map(c => [c.name, c.id]));

        for (const item of jsonData) {
          try {
            if (!item.title) {
              results.failed++;
              results.errors.push('标题不能为空');
              continue;
            }

            const category = item.category || item.category_name;
            const categoryId = category ? categoryMap.get(category) : null;
            
            let cloudDrives = [];
            if (item.cloud_drives) {
              cloudDrives = typeof item.cloud_drives === 'string' 
                ? JSON.parse(item.cloud_drives) 
                : item.cloud_drives;
            }

            await conn.query(`
              INSERT INTO resources (title, software_name, category_id, license, project_url, summary, content, cloud_drives, pinned, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `, [
              item.title,
              item.software_name || item.softwareName || null,
              categoryId || null,
              item.license || null,
              item.project_url || item.projectUrl || null,
              item.summary || '',
              item.content || '',
              JSON.stringify(cloudDrives),
              item.pinned === true || item.pinned === 'true'
            ]);
            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push(`导入失败: ${err.message}`);
          }
        }
      });

      await logOperation(req, '批量导入资源', 'resource', null, { count: results.success });

      res.json({
        message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
        ...results
      });
    } catch (error) {
      console.error('导入JSON失败:', error);
      res.status(500).json({ message: '导入失败' });
    }
  });

  return router;
};

module.exports = createImportExportRoutes;
