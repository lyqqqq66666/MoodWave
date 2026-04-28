#!/bin/bash

# MoodWave API 测试脚本
# 使用方法: bash test_api.sh

BASE_URL="http://localhost:8000/api"

echo "=========================================="
echo "MoodWave API 测试脚本"
echo "=========================================="
echo ""

# 检查后端服务是否运行
echo ">>> 检查后端服务状态..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/../docs")
if [ "$HEALTH_CHECK" != "200" ]; then
    echo "❌ 后端服务未运行，请先启动后端服务:"
    echo "   cd backend && python3 -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi
echo "✅ 后端服务正在运行"
echo ""

# ==================== 测试 P0 接口 ====================

echo "=========================================="
echo "P0 优先级接口测试"
echo "=========================================="
echo ""

# 测试1: POST /api/moods - 创建情绪记录
echo ">>> 测试1: POST /api/moods (创建 happy 情绪记录)"
CURL_OPTION1=$(curl -s -X POST "$BASE_URL/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "今天完成了前端重构，很开心！"
  }')
echo "$CURL_OPTION1" | python3 -m json.tool
echo ""

# 保存ID供后续测试使用
MOOD_ID=$(echo "$CURL_OPTION1" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ -z "$MOOD_ID" ]; then
    echo "⚠️  无法获取 mood_id，后续测试可能失败"
    MOOD_ID=1
fi
echo "✅ 创建的记录ID: $MOOD_ID"
echo ""

# 测试2: GET /api/moods - 获取情绪记录列表
echo ">>> 测试2: GET /api/moods (获取所有记录)"
curl -s -X GET "$BASE_URL/moods" | python3 -m json.tool
echo ""

# 测试3: GET /api/moods?limit=3 - 获取最近3条记录
echo ">>> 测试3: GET /api/moods?limit=3 (Dashboard用)"
curl -s -X GET "$BASE_URL/moods?limit=3" | python3 -m json.tool
echo ""

# 测试4: PUT /api/moods/{id} - 更新情绪记录
echo ">>> 测试4: PUT /api/moods/$MOOD_ID (更新记录)"
curl -s -X PUT "$BASE_URL/moods/$MOOD_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "intensity": 9,
    "note": "更新：今天特别开心！"
  }' | python3 -m json.tool
echo ""

# 测试5: DELETE /api/moods/{id} - 删除情绪记录
echo ">>> 测试5: DELETE /api/moods/$MOOD_ID (删除记录)"
curl -s -X DELETE "$BASE_URL/moods/$MOOD_ID" | python3 -m json.tool
echo ""

# ==================== 测试 P1 接口 ====================

echo "=========================================="
echo "P1 优先级接口测试"
echo "=========================================="
echo ""

# 测试6: POST /api/analytics/analyze - AI分析
echo ">>> 测试6: POST /api/analytics/analyze (AI分析 - happy)"
curl -s -X POST "$BASE_URL/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "今天完成了前端重构，很开心！"
  }' | python3 -m json.tool
echo ""

# 测试7: POST /api/analytics/analyze - AI分析 (anxious)
echo ">>> 测试7: POST /api/analytics/analyze (AI分析 - anxious)"
curl -s -X POST "$BASE_URL/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "anxious",
    "intensity": 6,
    "tags": ["study"],
    "note": "明天有考试，有点紧张"
  }' | python3 -m json.tool
echo ""

# 测试8: POST /api/analytics/analyze - AI分析 (angry)
echo ">>> 测试8: POST /api/analytics/analyze (AI分析 - angry)"
curl -s -X POST "$BASE_URL/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "angry",
    "intensity": 9,
    "tags": ["relationship"],
    "note": "和同学吵架了"
  }' | python3 -m json.tool
echo ""

# 测试9: GET /api/music/recommend - 音乐推荐
echo ">>> 测试9: GET /api/music/recommend?mood=calm (音乐推荐)"
curl -s -X GET "$BASE_URL/music/recommend?mood=calm&limit=3" | python3 -m json.tool
echo ""

# ==================== 测试边界情况 ====================

echo "=========================================="
echo "边界情况测试"
echo "=========================================="
echo ""

# 测试10: 创建记录（无标签）
echo ">>> 测试10: POST /api/moods (无标签)"
curl -s -X POST "$BASE_URL/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "calm",
    "intensity": 7,
    "tags": [],
    "note": "下午听了很多治愈音乐"
  }' | python3 -m json.tool
echo ""

# 测试11: 创建记录（高强度情绪）
echo ">>> 测试11: POST /api/moods (高强度情绪 intensity=10)"
curl -s -X POST "$BASE_URL/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "angry",
    "intensity": 10,
    "tags": ["work"],
    "note": "今天工作遇到很糟糕的事情"
  }' | python3 -m json.tool
echo ""

# 测试12: 获取记录（分页）
echo ">>> 测试12: GET /api/moods?skip=0&limit=2 (分页)"
curl -s -X GET "$BASE_URL/moods?skip=0&limit=2" | python3 -m json.tool
echo ""

# ==================== 测试错误情况 ====================

echo "=========================================="
echo "错误情况测试"
echo "=========================================="
echo ""

# 测试13: 创建记录（缺少必填字段）
echo ">>> 测试13: POST /api/moods (缺少必填字段 mood_type)"
curl -s -X POST "$BASE_URL/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "intensity": 8,
    "tags": [],
    "note": "缺少 mood_type"
  }' | python3 -m json.tool
echo ""

# 测试14: 创建记录（intensity超出范围）
echo ">>> 测试14: POST /api/moods (intensity=11 超出范围)"
curl -s -X POST "$BASE_URL/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "happy",
    "intensity": 11,
    "tags": [],
    "note": "intensity超出范围"
  }' | python3 -m json.tool
echo ""

# 测试15: 获取不存在的记录
echo ">>> 测试15: GET /api/moods?limit=0 (无记录)"
curl -s -X GET "$BASE_URL/moods?limit=0" | python3 -m json.tool
echo ""

# ==================== 测试总结 ====================

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "已测试接口："
echo "  P0: POST /api/moods"
echo "  P0: GET /api/moods"
echo "  P1: POST /api/analytics/analyze"
echo "  P1: GET /api/music/recommend"
echo ""
echo "请检查上述输出，确认："
echo "  1. 所有接口返回格式是否为 {code: 0, msg: 'ok', data: {...}}"
echo "  2. tags 字段是否为数组（而非字符串）"
echo "  3. GET /api/moods?limit=3 是否只返回3条记录"
echo ""
echo "如果接口返回错误，请："
echo "  1. 重启后端服务: cd backend && python3 -m uvicorn src.main:app --reload"
echo "  2. 重新运行测试: bash test_api.sh"
echo ""
