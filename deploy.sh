#!/bin/bash
# ============================================
# MoodWave 灵音 — 服务器一键部署/更新脚本
# 适用: 106.52.8.176 (腾讯云)
# ============================================

set -e

PROJECT_DIR="/root/MoodWave"  # ← 改成你服务器上的实际路径
BRANCH="main"

echo "🔄 [1/4] 拉取最新代码..."
cd "$PROJECT_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ""
echo "📦 [2/4] 检查 .env 文件..."
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env，请创建并填入以下变量："
    echo "   DB_PASSWORD=你的数据库密码"
    echo "   DEEPSEEK_API_KEY=你的DeepSeek密钥"
    echo "   DASHSCOPE_API_KEY=你的阿里云百炼密钥"
    echo "   JWT_SECRET=你的JWT密钥"
    exit 1
fi

echo ""
echo "🐳 [3/4] 重新构建并启动后端..."
# 停止旧容器 → 重新构建镜像 → 后台启动
docker compose down backend
docker compose build --no-cache backend
docker compose up -d backend

echo ""
echo "⏳ [4/4] 等待后端启动..."
sleep 5

# 健康检查
if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
    echo ""
    echo "✅ 后端部署成功！"
    echo "   API:  http://106.52.8.176:8000/api/health"
else
    echo ""
    echo "⚠️  后端可能启动异常，请检查日志："
    echo "   docker compose logs backend --tail 30"
fi

echo ""
echo "📌 前端部署提示："
echo "   Vercel 已绑定 GitHub，push 后自动部署。"
echo "   或者手动: cd frontend && npm run build && vercel --prod"
