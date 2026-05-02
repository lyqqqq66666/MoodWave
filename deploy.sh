#!/bin/bash
# ============================================
# MoodWave 灵音 — 服务器一键部署/更新脚本
# 适用: 106.52.8.176 (腾讯云)
# ============================================

set -e

PROJECT_DIR="/home/ubuntu/MoodWave"
BRANCH="main"

echo "🔄 [1/5] 拉取最新代码..."
cd "$PROJECT_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ""
echo "📦 [2/5] 检查 .env 文件..."
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env，请创建并填入以下变量："
    echo "   DB_PASSWORD=你的数据库密码"
    echo "   DEEPSEEK_API_KEY=你的DeepSeek密钥"
    echo "   DASHSCOPE_API_KEY=你的阿里云百炼密钥"
    echo "   JWT_SECRET=你的JWT密钥"
    exit 1
fi

echo ""
echo "🐳 [3/5] 重启后端..."
docker compose restart backend
sleep 3

echo ""
echo "⚡ [4/5] 构建前端..."
cd "$PROJECT_DIR/frontend"
echo "NEXT_PUBLIC_API_URL=http://106.52.8.176:8000" > .env.local
npm install --silent
npm run build

echo ""
echo "🚀 [5/5] 重启前端..."
pm2 restart moodwave-frontend 2>/dev/null || pm2 start npm --name moodwave-frontend -- run start
pm2 save

echo ""
echo "========================================"
echo "  部署完成！"
echo "  前端: http://106.52.8.176"
echo "  API:  http://106.52.8.176/api/health"
echo "========================================"
