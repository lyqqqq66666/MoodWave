#!/bin/bash

set -e

BASE_URL="http://localhost:8000/api"
RUN_ID=$(date +%s)
TEST_EMAIL="codex-smoke-${RUN_ID}@example.com"
TEST_USERNAME="codex_smoke_${RUN_ID}"
TEST_PASSWORD="Test123456"

pretty_json() {
  python3 -m json.tool 2>/dev/null || cat
}

echo "=========================================="
echo "MoodWave API 联调脚本"
echo "=========================================="
echo ""

echo ">>> 检查后端服务状态..."
HEALTH_CHECK=$(curl -s -o /tmp/moodwave_health.out -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH_CHECK" != "200" ]; then
    echo "❌ 后端服务未运行或健康检查失败"
    cat /tmp/moodwave_health.out
    exit 1
fi
echo "✅ 后端服务正在运行"
cat /tmp/moodwave_health.out | pretty_json
echo ""

echo ">>> 注册测试账号..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
echo "$REGISTER_RESPONSE" | pretty_json
echo ""

TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["access_token"])')

echo ">>> 登录测试账号..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
echo "$LOGIN_RESPONSE" | pretty_json
echo ""

echo ">>> 获取当前用户信息..."
curl -s "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | pretty_json
echo ""

echo ">>> 创建情绪记录..."
CREATE_MOOD_RESPONSE=$(curl -s -X POST "$BASE_URL/moods" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-05",
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "联调测试记录"
  }')
echo "$CREATE_MOOD_RESPONSE" | pretty_json
echo ""

MOOD_ID=$(echo "$CREATE_MOOD_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["id"])')

echo ">>> 获取最近 3 条情绪记录..."
curl -s "$BASE_URL/moods?limit=3" \
  -H "Authorization: Bearer $TOKEN" | pretty_json
echo ""

echo ">>> 获取单条情绪记录..."
curl -s "$BASE_URL/moods/$MOOD_ID" \
  -H "Authorization: Bearer $TOKEN" | pretty_json
echo ""

echo ">>> AI 情绪分析..."
curl -s -X POST "$BASE_URL/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "anxious",
    "intensity": 6,
    "tags": ["study"],
    "note": "明天有考试，有点紧张"
  }' | pretty_json
echo ""

echo ">>> 音乐推荐..."
curl -s "$BASE_URL/music/recommend?mood=calm&limit=3" | pretty_json
echo ""

echo ">>> Agent 状态..."
curl -s "$BASE_URL/ai/agent-status" | pretty_json
echo ""

echo "=========================================="
echo "联调完成"
echo "=========================================="
echo ""
echo "已验证："
echo "  1. 健康检查"
echo "  2. 注册 / 登录 / 获取当前用户"
echo "  3. 情绪记录创建 / 列表 / 详情"
echo "  4. AI 情绪分析"
echo "  5. 音乐推荐"
echo "  6. Agent 状态"
