#!/bin/bash
DIR="/home/ctyun/procject/boke"
cd "$DIR" || exit 1

# 每 30 分钟自动提交一次（如有变更），避免覆盖用户提交
while true; do
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    # 先拉取远程变更
    git pull --rebase --autostash origin master 2>/dev/null || true
    git add -A
    git diff --cached --quiet || git commit -m "auto sync $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin master 2>/dev/null || true
  fi
  sleep 1800
done
