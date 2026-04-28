# MoodWave API 接口文档

> 版本：v1.2  
> 更新时间：2026-04-28（Day 5 - 新增 analytics/weekly/summary 增强、解忧角 posts CRUD）  
> Base URL：`http://localhost:8000/api`

---

## 目录

1. [情绪记录接口](#1-情绪记录接口)
2. [图片上传接口](#2-图片上传接口)
3. [AI情绪分析接口](#3-ai情绪分析接口)
4. [**AI对话接口（SSE 流式）**](#4-ai对话接口-sse-流式响应) ← Day 4 新增
5. [音乐推荐接口](#5-音乐推荐接口)
6. [统一返回格式](#6-统一返回格式)
7. [状态码约定](#7-状态码约定)

---

## 1. 情绪记录接口

### 1.1 获取情绪记录列表

**接口路径**: `GET /api/moods`

**接口描述**: 获取情绪记录列表，支持分页和限制返回数量（用于Dashboard拉取最近N条）

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| skip | int | 否 | 0 | 跳过的记录数（用于分页） |
| limit | int | 否 | 100 | 返回的最大记录数（用于Dashboard拉取最近3条：limit=3） |

**请求示例**:
```bash
# 获取所有记录
curl -X GET "http://localhost:8000/api/moods"

# 获取最近3条记录（Dashboard用）
curl -X GET "http://localhost:8000/api/moods?limit=3"
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": [
    {
      "id": 1,
      "mood_type": "happy",
      "intensity": 8,
      "tags": ["study", "work"],
      "note": "今天完成了前端重构，很开心！",
      "created_at": "2026-04-27T10:00:00",
      "updated_at": "2026-04-27T10:00:00"
    }
  ]
}
```

**Curl 测试用例**:
```bash
# 测试1: 获取所有记录
curl -s -X GET "http://localhost:8000/api/moods" | python3 -m json.tool

# 测试2: 获取最近3条记录
curl -s -X GET "http://localhost:8000/api/moods?limit=3" | python3 -m json.tool

# 测试3: 分页获取（跳过前5条，取后面3条）
curl -s -X GET "http://localhost:8000/api/moods?skip=5&limit=3" | python3 -m json.tool
```

---

### 1.2 创建情绪记录

**接口路径**: `POST /api/moods`

**接口描述**: 创建新的情绪记录（情绪录入流程最后一步调用）

**请求体**:
```json
{
  "date": "2026-04-27",
  "mood_type": "happy",
  "intensity": 8,
  "tags": ["study", "work"],
  "note": "今天完成了前端重构，很开心！"
}
```

**请求参数说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| date | string | 是 | 记录日期（格式：YYYY-MM-DD） |
| mood_type | string | 是 | 情绪类型（happy/calm/anxious/angry/sad/neutral） |
| intensity | int | 是 | 情绪强度（1-10） |
| tags | array[string] | 是 | 标签列表（如["study", "work"]） |
| note | string | 否 | 描述文本（可选） |

**请求示例**:
```bash
curl -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "今天完成了前端重构，很开心！"
  }'
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "id": 1,
    "date": "2026-04-27",
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "今天完成了前端重构，很开心！",
    "created_at": "2026-04-27T10:00:00",
    "updated_at": "2026-04-27T10:00:00"
  }
}
```

**Curl 测试用例**:
```bash
# 测试1: 创建 happy 情绪记录
curl -s -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "happy",
    "intensity": 8,
    "tags": ["study", "work"],
    "note": "今天完成了前端重构，很开心！"
  }' | python3 -m json.tool

# 测试2: 创建 anxious 情绪记录
curl -s -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "anxious",
    "intensity": 6,
    "tags": ["health"],
    "note": "明天有考试，有点紧张"
  }' | python3 -m json.tool

# 测试3: 创建 calm 情绪记录（无标签）
curl -s -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "calm",
    "intensity": 7,
    "tags": [],
    "note": "下午听了很多治愈音乐"
  }' | python3 -m json.tool
```

---

### 1.3 更新情绪记录

**接口路径**: `PUT /api/moods/{mood_id}`

**接口描述**: 更新指定ID的情绪记录

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mood_id | int | 是 | 情绪记录ID（路径参数） |
| date | string | 否 | 记录日期 |
| mood_type | string | 否 | 情绪类型 |
| intensity | int | 否 | 情绪强度（1-10） |
| tags | array[string] | 否 | 标签列表 |
| note | string | 否 | 描述文本 |

**请求示例**:
```bash
curl -X PUT "http://localhost:8000/api/moods/1" \
  -H "Content-Type: application/json" \
  -d '{
    "intensity": 9,
    "note": "更新：今天特别开心！"
  }'
```

**响应格式**: 同创建情绪记录

**Curl 测试用例**:
```bash
# 测试1: 更新情绪强度
curl -s -X PUT "http://localhost:8000/api/moods/1" \
  -H "Content-Type: application/json" \
  -d '{"intensity": 9}' | python3 -m json.tool

# 测试2: 更新标签和备注
curl -s -X PUT "http://localhost:8000/api/moods/1" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["study", "work", "entertainment"], "note": "更新：完成了所有任务！"}' | python3 -m json.tool
```

---

### 1.4 删除情绪记录

**接口路径**: `DELETE /api/moods/{mood_id}`

**接口描述**: 删除指定ID的情绪记录

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mood_id | int | 是 | 情绪记录ID（路径参数） |

**请求示例**:
```bash
curl -X DELETE "http://localhost:8000/api/moods/1"
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "删除成功",
  "data": null
}
```

**Curl 测试用例**:
```bash
# 测试1: 删除记录ID=1
curl -s -X DELETE "http://localhost:8000/api/moods/1" | python3 -m json.tool
```

---

## 2. 图片上传接口

### 2.1 上传图片

**接口路径**: `POST /api/upload/image`

**接口描述**: 上传图片文件（用于情绪录入Step 3拍照/上传图片）

**请求格式**: `multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | 图片文件（支持jpg/png/gif，最大10MB） |

**请求示例**:
```bash
curl -X POST "http://localhost:8000/api/upload/image" \
  -F "file=@/path/to/your/image.jpg"
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "url": "/static/uploads/uuid-filename.jpg",
    "filename": "uuid-filename.jpg"
  }
}
```

**Curl 测试用例**:
```bash
# 测试1: 上传图片
curl -s -X POST "http://localhost:8000/api/upload/image" \
  -F "file=@/Users/LYQ/Desktop/test-image.jpg" | python3 -m json.tool

# 测试2: 上传PNG图片
curl -s -X POST "http://localhost:8000/api/upload/image" \
  -F "file=@/Users/LYQ/Desktop/test-image.png" | python3 -m json.tool
```

---

## 3. AI情绪分析接口

### 3.1 分析情绪并生成建议（已接入 DeepSeek API）

**接口路径**: `POST /api/analytics/analyze`

**接口描述**: 用 DeepSeek AI 分析情绪，返回洞察和建议（用于情绪录入 Step 5）

**请求体**:
```json
{
  "mood_type": "anxious",
  "intensity": 6,
  "tags": ["study"],
  "note": "明天有考试，有点紧张"
}
```

**请求参数说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mood_type | string | 是 | 情绪类型（happy/calm/anxious/angry/sad/neutral） |
| intensity | int | 是 | 情绪强度（1-10） |
| tags | array[string] | 否 | 标签列表 |
| note | string | 否 | 描述文本 |

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "summary": "你今天有些焦虑，考前紧张完全正常。",
    "insight": "考前焦虑往往来自对未知结果的担忧，聚焦你已经准备好的部分会更有帮助。",
    "suggestion": "试试 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，呼气 8 秒。睡前做 3 轮效果更好。",
    "music_mood": "calm",
    "energy_level": "high"
  }
}
```

> **注意**：Day 4 起 `data` 新增 `insight` 和 `energy_level` 字段。前端兼容处理即可（没有时用默认值）。

**Curl 测试用例**:
```bash
curl -s -X POST "http://localhost:8000/api/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "anxious",
    "intensity": 7,
    "tags": ["study"],
    "note": "期末周太焦虑了"
  }' | python3 -m json.tool
```

---

## 4. AI对话接口 (SSE 流式响应)

### 4.1 AI 情绪对话（流式）

**接口路径**: `POST /api/ai/chat`

**接口描述**: 与 AI 情绪伙伴「灵灵」对话，返回 **SSE 流式响应**（Server-Sent Events）。
用于音乐页右侧 AI mood insight 卡片实时打字效果。

**请求体**:
```json
{
  "mood_type": "anxious",
  "intensity": 7,
  "message": "最近期末压力好大，睡不好",
  "tags": ["study"],
  "history": []
}
```

**请求参数说明**:

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| mood_type | string | 否 | "neutral" | 当前情绪类型 |
| intensity | int | 否 | 5 | 情绪强度 1-10 |
| message | string | 否 | "" | 用户输入的文字 |
| tags | array[string] | 否 | null | 情绪标签 |
| history | array[object] | 否 | null | 历史对话，格式见下 |

**history 格式**:
```json
[
  {"role": "user", "content": "我今天很焦虑"},
  {"role": "assistant", "content": "我理解你的感受..."}
]
```

**SSE 响应格式**（每条 `data:` 后跟 JSON，以两个换行结尾）:

```
data: {"type": "text", "content": "我理解"}\n\n
data: {"type": "text", "content": "你现在"}\n\n
data: {"type": "text", "content": "的感受..."}\n\n
data: {"type": "done"}\n\n
```

| 事件类型 | 说明 |
|---------|------|
| `text` | 文本内容块，`content` 为当前 chunk |
| `done` | 流式结束，前端收到后停止读取 |
| `error` | 发生错误，`content` 为错误信息 |

**前端接入示例（TypeScript）**:
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mood_type: 'anxious',
    intensity: 7,
    message: '最近睡不好',
    tags: ['study'],
  }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let aiText = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const lines = decoder.decode(value).split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const json = JSON.parse(line.slice(6))
      if (json.type === 'text') {
        aiText += json.content
        setAiInsight(aiText) // 实时更新 UI
      } else if (json.type === 'done') {
        break
      }
    }
  }
}
```

**curl 测试（看流式输出）**:
```bash
curl -s -X POST "http://localhost:8000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "anxious",
    "intensity": 7,
    "message": "期末周压力好大",
    "tags": ["study"]
  }'
```

---

### 4.1 获取音乐推荐 → 见下方 5. 音乐推荐接口

---

## 5. 音乐推荐接口

### 5.1 获取音乐推荐

**接口路径**: `GET /api/music/recommend`

**接口描述**: 根据情绪类型获取推荐音乐列表。

**⚠️ 参数兼容说明**：同时支持 `mood_type` 和 `mood` 两种参数名（前端任选其一）：

```bash
GET /api/music/recommend?mood_type=happy   # ← Codex 前端当前写法
GET /api/music/recommend?mood=happy        # ← 等价写法
```

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| mood_type | string | 否 | — | 情绪类型（与 mood 等价） |
| mood | string | 否 | — | 情绪类型别名（与 mood_type 等价） |
| limit | int | 否 | 5 | 返回数量（1-20） |

**响应格式**（统一 `{code, msg, data}` 格式）:
```json
{
  "code": 0,
  "msg": "ok",
  "data": [
    {
      "id": "happy_1",
      "title": "Good as Hell",
      "artist": "Lizzo",
      "mood_type": "happy",
      "url": "https://example.com/music/happy_1.mp3",
      "duration": 180
    }
  ]
}
```

**Curl 测试用例**:
```bash
# 测试1: mood_type 参数名
curl -s "http://localhost:8000/api/music/recommend?mood_type=happy" | python3 -m json.tool

# 测试2: mood 参数名（等价）
curl -s "http://localhost:8000/api/music/recommend?mood=calm&limit=3" | python3 -m json.tool
```

---

所有接口返回格式统一为：

```json
{
  "code": 0,       // 状态码（0=成功，非0=失败）
  "msg": "ok",     // 提示信息
  "data": {}       // 响应数据（成功时为对象/数组，失败时为null）
}
```

**成功示例**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "id": 1,
    "mood_type": "happy"
  }
}
```

**失败示例**:
```json
{
  "code": 500,
  "msg": "分析失败: 错误信息",
  "data": null
}
```

---

## 6. 状态码约定

| 状态码 | 说明 | 示例场景 |
|--------|------|----------|
| 0 | 成功 | 所有接口调用成功 |
| 400 | 请求参数错误 | 缺少必填字段、字段格式错误 |
| 404 | 资源不存在 | 查询的记录不存在 |
| 500 | 服务器内部错误 | 数据库连接失败、AI分析失败 |

---

## 7. 测试用例

### 7.1 完整流程测试

**场景**: 用户完成一次情绪记录的全流程

```bash
# Step 1: 创建情绪记录
echo "=== Step 1: 创建情绪记录 ==="
RESPONSE=$(curl -s -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-27",
    "mood_type": "anxious",
    "intensity": 6,
    "tags": ["study"],
    "note": "明天有考试，有点紧张"
  }')
echo $RESPONSE | python3 -m json.tool

# Step 2: 获取AI分析建议
echo -e "\n=== Step 2: 获取AI分析建议 ==="
curl -s -X POST "http://localhost:8000/api/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_type": "anxious",
    "intensity": 6,
    "tags": ["study"],
    "note": "明天有考试，有点紧张"
  }' | python3 -m json.tool

# Step 3: 获取推荐音乐
echo -e "\n=== Step 3: 获取推荐音乐 ==="
curl -s -X GET "http://localhost:8000/api/music/recommend?mood=calm&limit=3" | python3 -m json.tool

# Step 4: 查看最近3条记录（Dashboard展示）
echo -e "\n=== Step 4: 查看最近3条记录 ==="
curl -s -X GET "http://localhost:8000/api/moods?limit=3" | python3 -m json.tool
```

---

### 7.2 Dashboard 数据加载测试

**场景**: Dashboard页面加载时，拉取最近3条记录

```bash
#!/bin/bash
# Dashboard 数据加载测试脚本

echo "=== Dashboard 数据加载测试 ==="

# 测试1: 拉取最近3条记录
echo -e "\n>>> 拉取最近3条记录:"
curl -s -X GET "http://localhost:8000/api/moods?limit=3" | python3 -m json.tool

# 测试2: 拉取最近5条记录
echo -e "\n>>> 拉取最近5条记录:"
curl -s -X GET "http://localhost:8000/api/moods?limit=5" | python3 -m json.tool

# 测试3: 分页加载（跳过前3条，取后面3条）
echo -e "\n>>> 分页加载（skip=3, limit=3）:"
curl -s -X GET "http://localhost:8000/api/moods?skip=3&limit=3" | python3 -m json.tool
```

---

### 7.3 情绪录入流程测试

**场景**: 情绪录入5步流程，最后提交数据

```bash
#!/bin/bash
# 情绪录入流程测试脚本

echo "=== 情绪录入流程测试 ==="

# Step 1: 用户选择情绪类型（happy）和强度（8）
MOOD_TYPE="happy"
INTENSITY=8
TAGS='["study", "work"]'
NOTE="今天完成了前端重构，很开心！"

# Step 2: 提交情绪记录
echo -e "\n>>> Step 1: 提交情绪记录"
RESPONSE=$(curl -s -X POST "http://localhost:8000/api/moods" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"2026-04-27\",
    \"mood_type\": \"$MOOD_TYPE\",
    \"intensity\": $INTENSITY,
    \"tags\": $TAGS,
    \"note\": \"$NOTE\"
  }")
echo $RESPONSE | python3 -m json.tool

# Step 3: 获取AI分析
echo -e "\n>>> Step 2: 获取AI分析"
curl -s -X POST "http://localhost:8000/api/analytics/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"mood_type\": \"$MOOD_TYPE\",
    \"intensity\": $INTENSITY,
    \"tags\": $TAGS,
    \"note\": \"$NOTE\"
  }" | python3 -m json.tool

# Step 4: 获取推荐音乐
echo -e "\n>>> Step 3: 获取推荐音乐"
curl -s -X GET "http://localhost:8000/api/music/recommend?mood=$MOOD_TYPE&limit=3" | python3 -m json.tool
```

---

## 8. 前后端联调注意事项

### 8.1 字段命名规范

| 位置 | 命名规范 | 示例 |
|------|----------|------|
| 前端（TypeScript） | camelCase | `moodType`, `createdAt` |
| 后端（Python） | snake_case | `mood_type`, `created_at` |
| 数据库（SQLite） | snake_case | `mood_type`, `created_at` |

**自动转换**: 使用 SQLModel/Pydantic 的 `from_attributes = True` 配置，自动处理 camelCase ↔ snake_case 转换。

---

### 8.2 Mock数据 vs 真接口

| 接口 | MVP阶段 | 说明 |
|------|---------|------|
| `GET /api/moods` | ✅ 真接口 | 已实现，连接SQLite数据库 |
| `POST /api/moods` | ✅ 真接口 | 已实现，连接SQLite数据库 |
| `POST /api/upload/image` | ⚠️ Mock | 前端可先Mock，后端已实现基础版本 |
| `POST /api/analytics/analyze` | ⚠️ Mock | 前端可先Mock，后端已实现规则引擎版本（后续接入DeepSeek API） |
| `GET /api/music/recommend` | ⚠️ Mock | 前端可先Mock，后端已实现基础版本 |

---

### 8.3 提交接口清单（给前端）

根据 `docs/day2-day3-workbuddy-handoff.md`，前端需要以下接口：

| 页面 | 接口 | 状态 |
|------|------|------|
| Dashboard（首页） | `GET /api/moods?limit=3` | ✅ 已完成 |
| 情绪录入（Step 5提交） | `POST /api/moods` | ✅ 已完成 |
| 情绪录入（Step 5 AI分析） | `POST /api/analytics/analyze` | ✅ 已完成 |
| 情绪录入（Step 3上传图片） | `POST /api/upload/image` | ✅ 已完成 |
| 音乐可视化页 | `GET /api/music/recommend?mood=xxx` | ✅ 已完成 |

---

## 9. 后续优化建议

1. **认证鉴权**: MVP阶段使用固定 `user_id=1`，后续接入微信登录/邮箱登录，使用 JWT Token 鉴权
2. **AI分析**: 当前使用规则引擎，后续接入 DeepSeek API 实现真正的AI分析
3. **音乐推荐**: 当前返回Mock数据，后续接入音乐API（如网易云音乐API）
4. **图片上传**: 当前保存到本地 `static/uploads/`，后续接入对象存储（如COS/OSS）
5. **数据分页**: 当前 `GET /api/moods` 支持 `skip` 和 `limit`，后续可优化为游标分页（性能更好）

---

## 10. 联系方式

如有接口问题，请联系：
- **后端负责人**: WorkBuddy
- **前端负责人**: Codex
- **项目文档**: `docs/day2-day3-workbuddy-handoff.md`

---

---

## 10. 数据分析接口（Day 5 新增/重构）

### 10.1 获取近7天情绪趋势

**接口路径**: `GET /api/analytics/weekly`

**接口描述**: 返回近7天情绪趋势数据（折线图用），**统一 `{code, msg, data}` 格式**。

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "weekly_trend": [
      {"date": "2026-04-27", "mood_type": "happy", "count": 2, "avg_intensity": 8.0}
    ],
    "total_moods": 1,
    "avg_score": 8.0,
    "mood_distribution": [
      {"mood_type": "happy", "count": 1, "percentage": 100.0}
    ],
    "top_tags": ["study", "work"]
  }
}
```

**curl 测试**:
```bash
curl -s "http://localhost:8000/api/analytics/weekly" | python3 -m json.tool
```

---

### 10.2 获取情绪汇总（饼图+热力日历）

**接口路径**: `GET /api/analytics/summary`

**接口描述**: 返回情绪汇总统计（饼图+热力日历+AI洞察），**统一 `{code, msg, data}` 格式**。

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "total_moods": 12,
    "avg_score": 6.5,
    "mood_distribution": [
      {"mood_type": "happy", "count": 5, "percentage": 41.7},
      {"mood_type": "calm", "count": 4, "percentage": 33.3}
    ],
    "heatmap_data": [
      {"date": "2026-04-27", "mood_type": "happy", "intensity": 8}
    ],
    "top_tags": ["study", "work"],
    "insight": "你近期的情绪状态非常积极，平均分达 8.0/10！继续保持 🌟",
    "suggestion": "你的高能量状态很珍贵，建议把这段时期记录到「快乐能量库」。"
  }
}
```

**curl 测试**:
```bash
curl -s "http://localhost:8000/api/analytics/summary" | python3 -m json.tool
```

---

## 11. 社区帖子接口（解忧角，Day 5 新增）

### 11.1 发帖

**接口路径**: `POST /api/posts`

**请求体**:
```json
{
  "content": "期末周太焦虑了...",
  "category": "study",
  "is_anonymous": true,
  "mood_id": 3
}
```

**category 可选值**: `general` / `study` / `emotion` / `vent`

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "id": 1,
    "content": "期末周太焦虑了...",
    "category": "study",
    "author_label": "匿名",
    "likes_count": 0,
    "comments_count": 0,
    "created_at": "2026-04-28T14:45:39",
    "user_mood_type": null
  }
}
```

**curl 测试**:
```bash
curl -s -X POST "http://localhost:8000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{"content": "和室友吵架了...", "category": "emotion", "is_anonymous": true}' | python3 -m json.tool
```

---

### 11.2 帖子列表

**接口路径**: `GET /api/posts`

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| category | string | "all" | 分类筛选（general/study/emotion/vent） |
| tag | string | "all" | 同 category（兼容旧参数名） |
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页数量 |

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "posts": [{...}],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

**curl 测试**:
```bash
curl -s "http://localhost:8000/api/posts?category=study&page=1" | python3 -m json.tool
curl -s "http://localhost:8000/api/posts?tag=emotion" | python3 -m json.tool
```

---

### 11.3 点赞帖子

**接口路径**: `POST /api/posts/{id}/like`

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {"likes_count": 5}
}
```

**curl 测试**:
```bash
curl -s -X POST "http://localhost:8000/api/posts/1/like" | python3 -m json.tool
```

---

### 11.4 取消点赞

**接口路径**: `DELETE /api/posts/{id}/like`

**响应格式**: 同点赞。

---

### 11.5 评论帖子

**接口路径**: `POST /api/posts/{id}/comment`

**请求体**:
```json
{"content": "抱抱你，期末加油！"}
```

**响应格式**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "comments_count": 1,
    "comment": {"id": 0, "post_id": 1, "content": "抱抱你！", "created_at": "..."}
  }
}
```

**curl 测试**:
```bash
curl -s -X POST "http://localhost:8000/api/posts/1/comment" \
  -H "Content-Type: application/json" \
  -d '{"content": "抱抱你！"}' | python3 -m json.tool
```

---

### 11.6 删除帖子

**接口路径**: `DELETE /api/posts/{id}`

**curl 测试**:
```bash
curl -s -X DELETE "http://localhost:8000/api/posts/1" | python3 -m json.tool
```

---

**文档结束**
