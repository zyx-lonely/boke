const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { logger } = require('../middleware/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'boke',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

async function withConn(fn) {
  const conn = await pool.getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}

async function initDatabase() {
  try {
    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        avatar VARCHAR(500) DEFAULT NULL,
        role ENUM('admin', 'editor', 'user') DEFAULT 'user',
        status ENUM('active', 'disabled') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 迁移：为已有表添加 avatar 字段
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN avatar VARCHAR(500) DEFAULT NULL AFTER email`);
    } catch (e) {
      // 字段已存在则忽略
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        icon VARCHAR(50),
        sort_order INT DEFAULT 0,
        status ENUM('active', 'disabled') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        software_name VARCHAR(100),
        category_id INT,
        license VARCHAR(50),
        project_url VARCHAR(500),
        summary TEXT,
        content TEXT,
        cloud_drives JSON,
        pinned BOOLEAN DEFAULT FALSE,
        hits INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_rating (user_id, resource_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM('pending', 'processed', 'resolved') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        resource_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        content TEXT NOT NULL,
        parent_id INT DEFAULT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (user_id, resource_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        comment_id INT NOT NULL,
        user_id INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_comment_like (comment_id, user_id),
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        username VARCHAR(50),
        action VARCHAR(100),
        resource_type VARCHAR(50),
        resource_id INT,
        details TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_subscription (user_id, category_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS resource_tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        resource_id INT NOT NULL,
        tag_id INT NOT NULL,
        UNIQUE KEY unique_resource_tag (resource_id, tag_id),
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES
      ('site_name', '资源分享博客'),
      ('site_description', '分享优质开源软件资源'),
      ('site_url', 'http://localhost:3000'),
      ('allow_register', 'true'),
      ('logo_text', '资源分享'),
      ('footer_text', '分享优质开源软件资源')
    `);

    await createIndexes(conn);

    await migrateResources(conn);

    const [adminRows] = await conn.query(`SELECT COUNT(*) as count FROM users`);
    if (adminRows[0].count === 0) {
      const crypto = require('crypto');
      const defaultPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');
      console.log('创建默认管理员账号...');
      console.log(`默认管理员密码: ${defaultPassword}`);
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      await conn.query(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`, ['admin', hashedPassword, 'admin@example.com', 'admin']);
    }

    const [resourceRows] = await conn.query(`SELECT COUNT(*) as count FROM resources`);
    if (resourceRows[0].count === 0) {
      console.log('导入初始资源数据...');
      await importInitialData(conn);
    }

    conn.release();
    console.log('数据库初始化完成');
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

async function createIndexes(conn) {
  const indexes = [
    `CREATE INDEX idx_resources_status ON resources(status)`,
    `CREATE INDEX idx_resources_category ON resources(category_id)`,
    `CREATE INDEX idx_resources_hits ON resources(hits DESC)`,
    `CREATE INDEX idx_resources_pinned ON resources(pinned DESC, updated_at DESC)`,
    `CREATE INDEX idx_resources_created ON resources(created_at DESC)`,
    `CREATE INDEX idx_comments_resource ON comments(resource_id)`,
    `CREATE INDEX idx_comments_status ON comments(status)`,
    `CREATE INDEX idx_favorites_user ON favorites(user_id)`,
    `CREATE INDEX idx_favorites_resource ON favorites(resource_id)`,
    `CREATE INDEX idx_operation_logs_created ON operation_logs(created_at DESC)`,
    `CREATE INDEX idx_operation_logs_user ON operation_logs(user_id)`,
    `CREATE INDEX idx_ratings_resource ON ratings(resource_id)`,
    `CREATE INDEX idx_subscriptions_user ON subscriptions(user_id)`,
    `CREATE INDEX idx_reports_status ON reports(status)`,
    `CREATE INDEX idx_tags_name ON tags(name)`,
    `CREATE INDEX idx_resource_tags_resource ON resource_tags(resource_id)`,
    `CREATE INDEX idx_resource_tags_tag ON resource_tags(tag_id)`
  ];

  for (const sql of indexes) {
    try { await conn.query(sql); } catch {}
  }
}

async function migrateResources(conn) {
  const migrations = [
    `ALTER TABLE resources ADD COLUMN category_id INT`,
    `ALTER TABLE resources DROP COLUMN category`,
    `ALTER TABLE resources DROP COLUMN tags`,
    `ALTER TABLE resources ADD COLUMN sort_order INT DEFAULT 0`,
    `ALTER TABLE resources ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'`,
    `ALTER TABLE resources ADD COLUMN rating DECIMAL(2,1) DEFAULT 0`,
    `ALTER TABLE resources ADD COLUMN rating_count INT DEFAULT 0`
  ];

  for (const sql of migrations) {
    try { await conn.query(sql); } catch {}
  }

  try {
    await conn.query(`
      INSERT IGNORE INTO categories (name)
      SELECT DISTINCT category FROM resources WHERE category IS NOT NULL
    `);
    await conn.query(`
      UPDATE resources r
      INNER JOIN categories c ON r.category = c.name
      SET r.category_id = c.id
      WHERE r.category IS NOT NULL
    `);
  } catch {}
}

async function importInitialData(conn) {
  const categories = [
    { name: '开发工具', description: '编程开发相关工具软件', icon: '🛠️' },
    { name: '效率工具', description: '提升工作效率的工具', icon: '⚡' },
    { name: '影音创作', description: '音视频编辑与创作工具', icon: '🎬' },
    { name: '设计工具', description: '图形设计与创意工具', icon: '🎨' },
    { name: '网络工具', description: '网络相关工具软件', icon: '🌐' },
    { name: '安全工具', description: '安全防护与隐私保护工具', icon: '🔒' }
  ];

  for (const cat of categories) {
    await conn.query(`INSERT IGNORE INTO categories (name, description, icon) VALUES (?, ?, ?)`, [cat.name, cat.description, cat.icon]);
  }
  console.log('已导入分类数据');

  const [catRows] = await conn.query(`SELECT id, name FROM categories`);
  const categoryMap = new Map(catRows.map(row => [row.name, row.id]));

  const samples = [
    { title: 'VSCodium：无遥测版本的开源代码编辑器', software_name: 'VSCodium', category: '开发工具', license: 'MIT', project_url: 'https://github.com/VSCodium/vscodium', summary: 'VSCodium 基于 VS Code 开源代码构建，适合希望使用现代编辑器但更重视开源构建和遥测控制的用户。', content: 'VSCodium 保留了 VS Code 的主流体验，包括扩展、调试、Git 集成和丰富的语言支持。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/vscodium', extraction_code: 'vsc1' }]) },
    { title: '7-Zip：高压缩率的开源压缩工具', software_name: '7-Zip', category: '效率工具', license: 'LGPL', project_url: 'https://www.7-zip.org/', summary: '7-Zip 是经典的开源压缩/解压工具，支持 7z、ZIP、RAR 等常见格式。', content: '7-Zip 以 7z 格式和 LZMA/LZMA2 压缩算法闻名。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/7zip', extraction_code: '7zip' }]) },
    { title: 'OBS Studio：直播与录屏的开源方案', software_name: 'OBS Studio', category: '影音创作', license: 'GPL-2.0', project_url: 'https://github.com/obsproject/obs-studio', summary: 'OBS Studio 是直播推流、课程录制、屏幕录制常用的开源工具。', content: 'OBS Studio 支持场景、来源、音频混音器、滤镜和推流设置。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/obs', extraction_code: 'obs1' }]) },
    { title: 'GIMP：跨平台开源图像编辑软件', software_name: 'GIMP', category: '设计工具', license: 'GPL-3.0', project_url: 'https://www.gimp.org/', summary: 'GIMP 是适合图片处理、海报制作和基础设计工作的开源图像编辑器。', content: 'GIMP 提供图层、蒙版、滤镜、路径、笔刷等常用图像编辑能力。', cloud_drives: JSON.stringify([{ cloud_drive: 'aliyun', download_url: 'https://www.aliyundrive.com/s/gimp', extraction_code: 'gimp' }]) },
    { title: 'FileZilla：稳定易用的开源 FTP/SFTP 客户端', software_name: 'FileZilla', category: '网络工具', license: 'GPL-2.0', project_url: 'https://filezilla-project.org/', summary: 'FileZilla 适合管理服务器文件、上传网站资源和进行 SFTP 连接。', content: 'FileZilla 支持 FTP、FTPS 和 SFTP。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/filezilla', extraction_code: 'ftp1' }]) },
    { title: 'Blender：专业级开源 3D 建模和动画软件', software_name: 'Blender', category: '设计工具', license: 'GPL-3.0', project_url: 'https://www.blender.org/', summary: 'Blender 是功能强大的开源 3D 创作套件，支持建模、动画、渲染、合成等。', content: 'Blender 可以胜任从简单的 3D 模型到复杂的影视级动画制作。', cloud_drives: JSON.stringify([{ cloud_drive: 'tencent', download_url: 'https://share.weiyun.com/blender', extraction_code: 'blnd' }]) },
    { title: 'HandBrake：免费开源视频转码工具', software_name: 'HandBrake', category: '影音创作', license: 'GPL-2.0', project_url: 'https://handbrake.fr/', summary: 'HandBrake 是简单易用的免费视频转码工具，支持几乎所有主流视频格式。', content: 'HandBrake 提供预设的转码方案。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/handbrake', extraction_code: 'hb1' }]) },
    { title: 'Audacity：开源音频编辑和录制软件', software_name: 'Audacity', category: '影音创作', license: 'GPL-2.0', project_url: 'https://www.audacityteam.org/', summary: 'Audacity 是功能丰富的免费音频编辑软件，支持录音、剪辑、降噪等。', content: 'Audacity 可以用于录制外部音频、编辑现有音频文件。', cloud_drives: JSON.stringify([{ cloud_drive: 'lanzou', download_url: 'https://www.lanzou.com/audacity', extraction_code: '' }]) },
    { title: 'Inkscape：专业开源矢量图形编辑器', software_name: 'Inkscape', category: '设计工具', license: 'GPL-2.0', project_url: 'https://inkscape.org/', summary: 'Inkscape 是开源矢量图形编辑器，可用于图标设计、插画、排版等。', content: 'Inkscape 支持 SVG 格式编辑。', cloud_drives: JSON.stringify([{ cloud_drive: 'aliyun', download_url: 'https://www.aliyundrive.com/s/inkscape', extraction_code: 'ink' }]) },
    { title: 'VSCode：微软开源的现代化代码编辑器', software_name: 'VS Code', category: '开发工具', license: 'MIT', project_url: 'https://github.com/microsoft/vscode', summary: 'VS Code 是微软开源的轻量级但功能强大的代码编辑器。', content: 'VS Code 凭借其丰富的扩展生态、智能代码补全。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/vscode', extraction_code: 'code' }]) },
    { title: 'Notepad++：Windows 经典文本编辑器', software_name: 'Notepad++', category: '开发工具', license: 'GPL-3.0', project_url: 'https://notepad-plus-plus.org/', summary: 'Notepad++ 是 Windows 上的轻量级文本和代码编辑器。', content: 'Notepad++ 支持语法高亮、代码折叠、多文档编辑。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/notepad', extraction_code: 'np' }]) },
    { title: 'KeePass：开源密码管理器', software_name: 'KeePass', category: '安全工具', license: 'GPL-3.0', project_url: 'https://keepass.info/', summary: 'KeePass 是开源密码管理器，帮助用户安全存储和管理密码。', content: 'KeePass 将所有密码存储在本地加密数据库中。', cloud_drives: JSON.stringify([{ cloud_drive: 'ctyun', download_url: 'https://cloud.189.cn/keepass', extraction_code: 'kp1' }]) },
    { title: 'VLC Media Player：全能开源播放器', software_name: 'VLC', category: '影音创作', license: 'GPL-2.0', project_url: 'https://www.videolan.org/', summary: 'VLC 是功能强大的开源媒体播放器，支持几乎所有音视频格式。', content: 'VLC 不仅能播放本地文件，还支持网络流媒体。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/vlc', extraction_code: 'vlc1' }]) },
    { title: 'Shotcut：免费开源视频编辑器', software_name: 'Shotcut', category: '影音创作', license: 'GPL-3.0', project_url: 'https://www.shotcut.org/', summary: 'Shotcut 是免费开源的视频编辑软件，支持多轨编辑和丰富的滤镜。', content: 'Shotcut 基于 MLT 框架，支持数百种音视频格式。', cloud_drives: JSON.stringify([{ cloud_drive: 'kuaike', download_url: 'https://pan.quark.cn/shotcut', extraction_code: 'sc1' }]) },
    { title: 'LibreOffice：开源办公套件', software_name: 'LibreOffice', category: '效率工具', license: 'MPL-2.0', project_url: 'https://www.libreoffice.org/', summary: 'LibreOffice 是开源办公套件，包含文档、表格、演示等组件。', content: 'LibreOffice 提供 Writer、Calc、Impress、Draw 等组件。', cloud_drives: JSON.stringify([{ cloud_drive: 'aliyun', download_url: 'https://www.aliyundrive.com/s/libreoffice', extraction_code: 'lo1' }]) },
    { title: 'Calibre：开源电子书管理软件', software_name: 'Calibre', category: '效率工具', license: 'GPL-3.0', project_url: 'https://calibre-ebook.com/', summary: 'Calibre 是强大的开源电子书管理器，支持电子书格式转换和阅读。', content: 'Calibre 可以管理、转换和阅读电子书。', cloud_drives: JSON.stringify([{ cloud_drive: 'lanzou', download_url: 'https://www.lanzou.com/calibre', extraction_code: '' }]) },
    { title: 'Homebrew：macOS/Linux 开源包管理器', software_name: 'Homebrew', category: '开发工具', license: 'BSD-2-Clause', project_url: 'https://brew.sh/', summary: 'Homebrew 是 macOS 和 Linux 上的包管理器。', content: 'Homebrew 让用户可以通过简单的命令安装软件包。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/homebrew', extraction_code: 'brew' }]) },
    { title: 'Python：广泛使用的高级编程语言', software_name: 'Python', category: '开发工具', license: 'PSF', project_url: 'https://www.python.org/', summary: 'Python 是一门易学易用的编程语言。', content: 'Python 以其简洁的语法和强大的库生态著称。', cloud_drives: JSON.stringify([{ cloud_drive: 'baidu', download_url: 'https://pan.baidu.com/s/python', extraction_code: 'py3' }]) }
  ];

  for (const item of samples) {
    const categoryId = categoryMap.get(item.category);
    await conn.query(`INSERT INTO resources (title, software_name, category_id, license, project_url, summary, content, cloud_drives) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item.title, item.software_name, categoryId, item.license, item.project_url, item.summary, item.content, item.cloud_drives]);
  }
  console.log(`已导入 ${samples.length} 条资源数据`);
}

module.exports = { pool, withConn, initDatabase };
