require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');

const { logger, expressLogger } = require('./middleware/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const RateLimiter = require('./middleware/rateLimiter');
const requestIdMiddleware = require('./middleware/requestId');
const { pool, initDatabase } = require('./config/database');
const { authMiddleware, adminMiddleware, editorMiddleware, logOperation } = require('./config/middleware');
const { getCachedData, setCachedData, clearCache, dataCache } = require('./config/cache');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置！请在 .env 文件中配置');
  process.exit(1);
}

const createAuthRoutes = require('./routes/authRoutes');
const createCommentRoutes = require('./routes/commentRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createResourceRoutes = require('./routes/resourceRoutes');
const createCategoryRoutes = require('./routes/categoryRoutes');
const createStatsRoutes = require('./routes/statsRoutes');
const createFavoriteRoutes = require('./routes/favoriteRoutes');
const createRankingRoutes = require('./routes/rankingRoutes');
const createSubscriptionRoutes = require('./routes/subscriptionRoutes');
const createRatingRoutes = require('./routes/ratingRoutes');
const createReportRoutes = require('./routes/reportRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createTagRoutes = require('./routes/tagRoutes');
const createImportExportRoutes = require('./routes/importExportRoutes');
const createSettingsRoutes = require('./routes/settingsRoutes');
const createProfileRoutes = require('./routes/profileRoutes');

const app = express();
const port = process.env.PORT || 3000;

const captchaStore = new Map();
const MAX_CAPTCHA_COUNT = 1000;

const globalLimiter = new RateLimiter(15 * 60 * 1000, 10000);
const globalLimiterMiddleware = globalLimiter.middleware();

app.use((req, res, next) => {
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/)) return next();
  return globalLimiterMiddleware(req, res, next);
});

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  const requestOrigin = req.headers.origin;
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

const compression = require('compression');
app.use(compression());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(expressLogger);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'web', 'dist'), { maxAge: '7d', immutable: true }));

const uploadDir = path.join(__dirname, 'public', 'uploads');
require('fs').mkdirSync(uploadDir, { recursive: true });

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 10000;

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts) {
    if (now > data.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
  if (loginAttempts.size > MAX_LOGIN_ATTEMPTS) {
    const entries = Array.from(loginAttempts.entries());
    entries.sort((a, b) => a[1].count - b[1].count);
    const toDelete = entries.slice(0, entries.length - MAX_LOGIN_ATTEMPTS);
    toDelete.forEach(([key]) => loginAttempts.delete(key));
  }
}, 60000);

app.use(createAuthRoutes(authMiddleware, adminMiddleware, logOperation, captchaStore, loginAttempts));
app.use(createCommentRoutes(pool, authMiddleware, adminMiddleware));
app.use(createUserRoutes(authMiddleware, adminMiddleware, logOperation));
app.use(createResourceRoutes(authMiddleware, editorMiddleware, logOperation, getCachedData, setCachedData, clearCache));
app.use(createCategoryRoutes(authMiddleware, adminMiddleware, logOperation, getCachedData, setCachedData, clearCache));
app.use(createStatsRoutes(authMiddleware, getCachedData, setCachedData));
app.use(createFavoriteRoutes(authMiddleware));
app.use(createRankingRoutes(getCachedData, setCachedData));
app.use(createSubscriptionRoutes(authMiddleware));
app.use(createRatingRoutes(authMiddleware));
app.use(createReportRoutes(authMiddleware));
app.use(createAdminRoutes(authMiddleware, adminMiddleware, logOperation));
app.use(createTagRoutes(authMiddleware, adminMiddleware, logOperation, getCachedData, setCachedData, clearCache));
app.use(createImportExportRoutes(authMiddleware, editorMiddleware, logOperation));
app.use(createSettingsRoutes(authMiddleware, adminMiddleware));
app.use(createProfileRoutes(authMiddleware));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

dataCache.startCleanup(30000);

setInterval(() => {
  const now = Date.now();
  const keysToDelete = [];
  captchaStore.forEach((value, key) => {
    if (now - value.createdAt > 5 * 60 * 1000) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => captchaStore.delete(key));

  while (captchaStore.size > MAX_CAPTCHA_COUNT) {
    const oldestKey = captchaStore.keys().next().value;
    if (oldestKey) captchaStore.delete(oldestKey);
  }
}, 30000);

setInterval(() => {
  const used = process.memoryUsage();
  const stats = dataCache.getStats();
  console.log(`[内存监控] 已用: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB, 缓存: ${stats.size}项, 命中率: ${stats.hitRate}`);
}, 60000);

const fs = require('fs');
const vueIndex = path.join(__dirname, 'web', 'dist', 'index.html');
if (fs.existsSync(vueIndex)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.path.match(/\.\w+$/)) return next();
    res.sendFile(vueIndex);
  });
}

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  initDatabase().then(() => {
    const server = app.listen(port, () => {
      logger.info(`服务器已启动: http://localhost:${port}`);
      logger.info(`后台管理: http://localhost:${port}/admin`);
      logger.info(`默认管理员账号: admin（密码请查看上方启动日志）`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} 信号收到，正在关闭服务器...`);
      server.close(() => {
        logger.info('服务器已关闭');
        pool.end().then(() => {
          logger.info('数据库连接池已关闭');
          process.exit(0);
        });
      });
      setTimeout(() => {
        logger.error('强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }).catch(error => {
    logger.error('数据库初始化失败', { error });
    process.exit(1);
  });
}

module.exports = app;
