const express = require('express');
const { withConn } = require('../config/database');
const parseRow = require('../utils/parseRow');

const createStatsRoutes = (authMiddleware, getCachedData, setCachedData) => {
  const router = express.Router();

  router.get('/api/admin/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await withConn(async (conn) => {
        const [resourceStats] = await conn.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN pinned = 1 THEN 1 ELSE 0 END) as pinned,
            SUM(hits) as totalHits
          FROM resources
        `);
        
        const [commentStats] = await conn.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
          FROM comments
        `);
        
        const [userStats] = await conn.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN role = 'editor' THEN 1 ELSE 0 END) as editors
          FROM users
        `);
        
        const [categoryStats] = await conn.query(`
          SELECT c.id, c.name, c.icon, COUNT(r.id) as count 
          FROM categories c
          LEFT JOIN resources r ON c.id = r.category_id
          GROUP BY c.id, c.name, c.icon
          ORDER BY count DESC 
          LIMIT 10
        `);
        
        const [recentResources] = await conn.query(`
          SELECT title, hits, created_at 
          FROM resources 
          WHERE status = 'approved' 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        const [topResources] = await conn.query(`
          SELECT title, hits, created_at 
          FROM resources 
          WHERE status = 'approved' 
          ORDER BY hits DESC 
          LIMIT 5
        `);

        const [resourceTrend] = await conn.query(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM resources
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);

        const [userTrend] = await conn.query(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM users
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);

        const [commentTrend] = await conn.query(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM comments
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);

        const [dailyHits] = await conn.query(`
          SELECT DATE(updated_at) as date, SUM(hits) as hits
          FROM resources
          WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(updated_at)
          ORDER BY date ASC
        `);

        const rs = resourceStats[0] || {};
        const cs = commentStats[0] || {};
        const us = userStats[0] || {};
        return {
          totalResources: rs.total || 0,
          pinnedResources: rs.pinned || 0,
          totalHits: rs.totalHits || 0,
          totalCategories: categoryStats ? categoryStats.length : 0,
          totalComments: cs.total || 0,
          totalUsers: us.total || 0,
          resources: rs,
          comments: cs,
          users: us,
          categories: categoryStats,
          recentResources,
          topResources,
          trends: {
            resources: resourceTrend,
            users: userTrend,
            comments: commentTrend,
            dailyHits
          }
        };
      });
      
      res.json(stats);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      res.status(500).json({ message: '获取统计数据失败' });
    }
  });

  // 系统健康监控
  router.get('/api/admin/health', authMiddleware, async (req, res) => {
    try {
      const health = {};
      
      // 内存使用
      const memUsage = process.memoryUsage();
      health.memory = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      
      // CPU使用
      health.cpu = {
        uptime: Math.round(process.uptime()),
        cpus: require('os').cpus().length,
        loadavg: require('os').loadavg().map(v => Math.round(v * 100) / 100)
      };
      
      // 数据库连接
      try {
        const conn = await withConn(async (conn) => {
          await conn.query('SELECT 1 as ok');
          return true;
        });
        health.database = { status: 'connected' };
      } catch (e) {
        health.database = { status: 'error', message: e.message };
      }
      
      // 磁盘使用
      const fs = require('fs');
      const path = require('path');
      try {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        const files = fs.readdirSync(uploadDir);
        let totalSize = 0;
        files.forEach(f => {
          try { totalSize += fs.statSync(path.join(uploadDir, f)).size; } catch {}
        });
        health.disk = { uploadFiles: files.length, uploadSize: Math.round(totalSize / 1024 / 1024) };
      } catch (e) {
        health.disk = { uploadFiles: 0, uploadSize: 0 };
      }
      
      // 进程信息
      health.process = {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.round(process.uptime())
      };
      
      res.json({
        status: 'ok',
        uptime: health.process.uptime,
        memory: health.memory,
        cpu: { usage: health.cpu.loadavg[0] },
        nodeVersion: health.process.nodeVersion,
        database: {
          connected: health.database.status === 'connected',
          activeConnections: 0
        }
      });
    } catch (error) {
      res.status(500).json({ message: '获取健康信息失败' });
    }
  });

  // 用户行为分析
  router.get('/api/admin/user-behavior', authMiddleware, async (req, res) => {
    try {
      const behavior = await withConn(async (conn) => {
        // 活跃用户统计
        const [activeUsers] = await conn.query(`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM operation_logs 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // 用户操作类型分布
        const [actionDistribution] = await conn.query(`
          SELECT action, COUNT(*) as count 
          FROM operation_logs 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY action 
          ORDER BY count DESC 
          LIMIT 10
        `);
        
        // 最活跃用户
        const [topUsers] = await conn.query(`
          SELECT username, COUNT(*) as action_count 
          FROM operation_logs 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY username 
          ORDER BY action_count DESC 
          LIMIT 10
        `);
        
        // 每日活跃趋势
        const [dailyActive] = await conn.query(`
          SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count 
          FROM operation_logs 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at) 
          ORDER BY date ASC
        `);
        
        // 资源浏览趋势
        const [resourceViews] = await conn.query(`
          SELECT DATE(created_at) as date, SUM(hits) as total_hits 
          FROM resources 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at) 
          ORDER BY date ASC
        `);
        
        return {
          activeUsers: activeUsers[0]?.count || 0,
          actionDistribution,
          topUsers,
          dailyActive,
          resourceViews
        };
      });
      
      res.json(behavior);
    } catch (error) {
      console.error('获取用户行为分析失败:', error);
      res.status(500).json({ message: '获取用户行为分析失败' });
    }
  });

  router.get('/api/admin/stats/trend', authMiddleware, async (req, res) => {
    try {
      const { type = 'resource', days = 7 } = req.query;
      const limit = Math.min(parseInt(days) || 7, 90);
      
      const result = await withConn(async (conn) => {
        let query;
        switch (type) {
          case 'user':
            query = `
              SELECT DATE(created_at) as date, COUNT(*) as count
              FROM users
              WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY DATE(created_at)
              ORDER BY date ASC
            `;
            break;
          case 'comment':
            query = `
              SELECT DATE(created_at) as date, COUNT(*) as count
              FROM comments
              WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY DATE(created_at)
              ORDER BY date ASC
            `;
            break;
          case 'resource':
          default:
            query = `
              SELECT DATE(created_at) as date, COUNT(*) as count
              FROM resources
              WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY DATE(created_at)
              ORDER BY date ASC
            `;
        }
        const [rows] = await conn.query(query, [limit]);
        return rows;
      });
      
      res.json(result);
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      res.status(500).json({ message: '获取趋势数据失败' });
    }
  });

  router.get('/api/hot', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 5;
      const cachedHot = getCachedData('hotResources');
      if (cachedHot) {
        res.json(cachedHot.slice(0, limit));
        return;
      }

      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`SELECT * FROM resources WHERE status = 'approved' ORDER BY hits DESC LIMIT 20`);
        return result;
      });
      const result = rows.map(parseRow);
      
      setCachedData('hotResources', result);
      res.json(result.slice(0, limit));
    } catch (error) {
      console.error('获取热门资源失败:', error);
      res.status(500).json({ message: '获取热门资源失败' });
    }
  });

  router.get('/api/recent', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 5;
      const cachedRecent = getCachedData('recentResources');
      if (cachedRecent) {
        res.json(cachedRecent.slice(0, limit));
        return;
      }

      const rows = await withConn(async (conn) => {
        const [result] = await conn.query(`SELECT * FROM resources WHERE status = 'approved' ORDER BY updated_at DESC LIMIT 20`);
        return result;
      });
      const result = rows.map(parseRow);
      
      setCachedData('recentResources', result);
      res.json(result.slice(0, limit));
    } catch (error) {
      console.error('获取最新资源失败:', error);
      res.status(500).json({ message: '获取最新资源失败' });
    }
  });

  return router;
};

module.exports = createStatsRoutes;
