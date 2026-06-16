# 开源资源分享博客 (Open Source Resource Blog)

带后台管理的开源软件资源分享博客平台。

## 功能特性

- 用户注册与登录（JWT 认证，验证码保护）
- **GitHub 第三方登录**（可选配置）
- 资源发布、分类、标签、**全文搜索**（MySQL FULLTEXT）
- 评论与回复（嵌套评论，审核机制，**站内通知**）
- **邮件通知**（评论审核通知、邮箱验证、密码重置）
- 收藏与分类订阅
- 资源评分（1-5 星）与排行榜
- 资源举报机制
- 后台管理面板（仪表盘、资源/分类/标签/用户/评论管理）
- 操作日志审计（筛选、导出、清理）
- 系统健康监控与用户行为分析
- CSV/JSON 批量导入导出
- 数据备份（JSON 导出）
- 网站设置（**SMTP 邮件配置**、动态设置）
- 登录失败锁定保护
- 请求频率限制
- 暗色模式 + **5 套主题预设**（浅色/深色/海洋蓝/森林绿/日落橙）
- **Docker 部署**（App + MySQL 编排）
- **RSS 订阅** + **Sitemap** 自动生成
- **Swagger API 文档**
- **用户个人中心**（邮箱管理、评论列表、收藏统计）
- **友情链接管理**
- 文章归档
- 资源草稿

## 技术栈

| 层 | 技术 |
|----|------|
| **后端** | Node.js + Express 4.19 |
| **数据库** | MySQL 8.0+ (mysql2/promise 连接池) |
| **认证** | JWT (jsonwebtoken) + bcrypt + Passport (GitHub OAuth) |
| **邮件** | Nodemailer (SMTP 动态配置) |
| **安全** | Helmet, CORS, 验证码 (svg-captcha), 限流 |
| **日志** | Winston (文件 + 控制台) |
| **验证** | express-validator |
| **上传** | Multer (图片) |
| **前端** | Vue 3 (Composition API) + Vue Router 4 + Pinia 2 |
| **UI** | Element Plus 2.9 + CSS 变量主题系统 |
| **构建** | Vite 6 + unplugin-auto-import |
| **富文本** | Vditor (Markdown + WYSIWYG) |
| **API 文档** | Swagger (swagger-jsdoc + swagger-ui-express) |
| **测试** | Jest + Supertest + Sinon |
| **缓存** | LRU 内存缓存 |
| **部署** | Docker + docker-compose |

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0（或使用 Docker）

### 安装

```bash
git clone https://github.com/zyx-lonely/boke.git
cd boke
npm install
```

### 配置

复制 `.env.example` 为 `.env` 并根据实际情况修改：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=boke
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

> 默认管理员账号 `admin`，密码由 `ADMIN_PASSWORD` 环境变量指定，未设置时自动生成并打印在启动日志中。

### 初始化数据库

数据库表在服务启动时自动创建（含种子数据），无需手动初始化。

```bash
npm start
```

### 启动

```bash
# 启动后端
npm start

# 启动前端开发服务器（另一个终端）
npm run dev:web
```

访问 `http://localhost:3000`（生产模式）或 `http://localhost:5173`（开发模式）

### Docker 部署

```bash
docker-compose up -d
```

包含 MySQL 8.0 + App 自动编排，healthcheck 确保数据库就绪后启动应用。

## 邮件配置

进入后台 → 系统设置 → SMTP 配置，填写发件信息后点击「测试邮件」验证。支持 QQ邮箱 / Gmail / SendGrid 等。

## 运行测试

```bash
npm test
```

## 项目架构

```
├── config/
│   ├── database.js        # MySQL 连接池 + 自动建表 + 种子数据
│   ├── cache.js           # LRU 内存缓存（默认 100 项，60s TTL）
│   └── middleware.js      # JWT 认证、角色鉴权、操作日志
├── controllers/
│   └── commentController.js
├── middleware/
│   ├── errorHandler.js    # 全局错误处理 + AppError 类
│   ├── logger.js          # Winston 日志
│   ├── rateLimiter.js     # 滑动窗口限流
│   ├── requestId.js       # X-Request-Id
│   └── validation.js      # express-validator 辅助
├── routes/
│   ├── authRoutes.js      # 注册/登录/头像/改密/邮箱验证/密码重置/GitHub OAuth
│   ├── resourceRoutes.js  # 资源 CRUD、状态管理（含草稿）
│   ├── categoryRoutes.js  # 分类管理
│   ├── tagRoutes.js       # 标签管理 + 资源-标签关联
│   ├── commentRoutes.js   # 评论 CRUD、点赞、审核
│   ├── favoriteRoutes.js  # 收藏/取消收藏
│   ├── rankingRoutes.js   # 浏览量/收藏/评论排行
│   ├── ratingRoutes.js    # 1-5 星评分
│   ├── reportRoutes.js    # 资源举报
│   ├── subscriptionRoutes.js  # 分类订阅
│   ├── userRoutes.js      # 后台用户管理
│   ├── statsRoutes.js     # 统计、健康监控、行为分析
│   ├── adminRoutes.js     # 文件上传、操作日志、备份
│   ├── importExportRoutes.js  # CSV/JSON 批量导入导出
│   ├── settingsRoutes.js  # 站点动态设置（含 SMTP 测试）
│   ├── profileRoutes.js   # 用户个人中心（资料/评论/收藏/重新验证）
│   ├── searchRoutes.js    # 全文搜索 + 文章归档
│   ├── rssRoutes.js       # RSS 订阅 + Sitemap 生成
│   ├── friendLinkRoutes.js # 友情链接 CRUD
│   └── notificationRoutes.js # 站内通知
├── services/
│   ├── commentService.js  # 评论业务逻辑（含通知创建）
│   └── emailService.js    # 邮件发送服务（SMTP 动态配置）
├── swagger.js             # OpenAPI 配置
├── web/                   # Vue 3 前端
│   └── src/
│       ├── api/           # Axios API 封装
│       ├── router/        # 路由配置
│       ├── stores/        # Pinia 状态管理（含多主题）
│       ├── components/    # Navbar, Footer, VditorEditor
│       └── views/         # 页面组件
│           └── admin/     # 后台管理页面
├── test/                  # Jest 测试
├── public/uploads/        # 上传文件目录
├── Dockerfile             # 多阶段 Docker 构建
├── docker-compose.yml     # MySQL + App 编排
└── server.js              # 入口文件
```

## API 概览

| 分组 | 前缀 | 认证 |
|------|------|------|
| 认证 | `/api/auth/*` | 部分需要 |
| GitHub OAuth | `/api/auth/github*` | 公开 |
| 邮箱验证 | `/api/auth/verify-email` | 公开 |
| 密码重置 | `/api/auth/forgot-password`, `/api/auth/reset-password` | 公开 |
| 管理员认证 | `/api/admin/*` | JWT + 角色 |
| 资源 | `/api/resources*` | 公开读，管理员写 |
| 分类 | `/api/categories*` | 公开读，管理员写 |
| 标签 | `/api/tags*` | 公开读，管理员写 |
| 评论 | `/api/comments*` | 部分需要 |
| 收藏 | `/api/favorites*` | JWT |
| 排行榜 | `/api/rankings` | 公开 |
| 评分 | `/api/resources/:id/rating` | JWT |
| 举报 | `/api/resources/:id/report` | JWT |
| 订阅 | `/api/subscriptions*` | JWT |
| 搜索 | `/api/search` | 公开 |
| 归档 | `/api/archive` | 公开 |
| RSS | `/api/rss` | 公开 |
| Sitemap | `/sitemap.xml` | 公开 |
| 统计 | `/api/admin/stats*` | JWT |
| 通知 | `/api/notifications*` | JWT |
| 用户中心 | `/api/user/*` | JWT |
| 友情链接 | `/api/friend-links` | 公开读，管理员写 |
| 设置 | `/api/settings` | 公开读，管理员写 |

完整 API 文档：启动后访问 `http://localhost:3000/api/docs`

## 安全措施

- 密码 bcrypt 加密（12 轮）
- JWT 无状态认证
- SVG 验证码（管理员登录）
- 登录失败锁定（5 次失败锁定 5 分钟）
- 全局请求频率限制
- Helmet 安全头
- CORS 白名单
- XSS 防护（前端 DOMPurify）
- SQL 注入防护（参数化查询）
- 文件上传类型/大小限制
- 路径遍历防护（头像）
- 操作日志审计

## 起源

纯属了解下 Ai，制作下看看
如有发现 Bug, 或者有好的建议, 可以进行反馈, 欢迎各位大佬来指点一二

## License

MIT
