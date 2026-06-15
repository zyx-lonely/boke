# 开源资源分享博客 (Open Source Resource Blog)

带后台管理的开源软件资源分享博客平台。

## 功能特性

- 用户注册与登录（JWT 认证）
- 资源发布、分类、搜索
- 评论与回复
- 收藏与订阅
- 资源评分与排行
- 验证码安全保护
- 后台管理面板
- 登录失败锁定保护

## 技术栈

- **后端**: Node.js + Express
- **数据库**: MySQL
- **前端**: 传统 Web 页面 + Vue 3 管理后台 (`web/`)
- **认证**: JWT + Session
- **其他**: bcrypt, helmet, multer, winston, xlsx

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0

### 安装

```bash
git clone https://github.com/zyx-lonely/boke.git
cd boke
npm install
```

### 配置

复制 `.env` 文件并根据实际情况修改数据库连接等配置：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=boke
JWT_SECRET=your_jwt_secret
```

### 初始化数据库

```bash
node scripts/initDB.js
```

### 启动

```bash
npm start
```

访问 `http://localhost:3000`

### 启动管理后台

```bash
npm run dev:web
```

## 目录结构

```
├── config/        # 数据库、缓存、中间件配置
├── controllers/   # 控制器
├── middleware/    # 中间件（日志、限流、错误处理）
├── routes/        # 路由
├── services/      # 服务层
├── public/        # 静态资源
├── web/           # 管理后台前端（Vue 3）
├── scripts/       # 脚本（数据库初始化等）
├── test/          # 测试
├── logs/          # 日志
├── server.js      # 入口文件
└── package.json
```

## 测试

```bash
npm test
```

## License

MIT
