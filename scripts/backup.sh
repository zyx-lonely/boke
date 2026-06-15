#!/bin/bash

# 数据库备份脚本
# 用法: ./backup.sh [备份目录]

set -e

# 配置
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-admin123}
DB_NAME=${DB_NAME:-boke}
BACKUP_DIR=${1:-./backups}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
echo "开始备份数据库 ${DB_NAME}..."
mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" > "$BACKUP_FILE"

# 压缩备份文件
gzip "$BACKUP_FILE"
echo "备份完成: ${BACKUP_FILE}.gz"

# 保留最近7天的备份
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true

echo "旧备份已清理（保留7天）"
