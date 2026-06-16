#!/bin/bash
DIR="/home/ctyun/procject/boke"
cd "$DIR" || exit 1

# 每 30 分钟自动提交一次（如有变更）
while true; do
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    git add -A
    git commit -m "auto sync $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin master
  fi
  sleep 1800
done
