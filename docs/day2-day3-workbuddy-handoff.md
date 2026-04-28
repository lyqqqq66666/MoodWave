# MoodWave Day 2-3 接口交接文档

## 目标

本轮前端已经按以下约束完成页面骨架重建：

- `Web原型设计` 视觉原型
- `CLAUDE.md` 里的 Next.js App Router 架构
- `7天冲刺计划.md` 的 Day 2 / Day 3 范围

当前前端已完成页面：

- `frontend/src/app/page.tsx`：Landing
- `frontend/src/app/login/page.tsx`：登录页
- `frontend/src/app/dashboard/page.tsx`：首页
- `frontend/src/app/mood/page.tsx`：情绪录入 Step 1-5

请 `workbuddy` 以后端接口设计和联调为主，不需要再改页面结构。

---

## 优先级

### P0：必须先完成

1. `GET /api/moods`
2. `POST /api/moods`

这两个接口直接影响：

- Dashboard 最近记录
- 情绪录入提交流程

### P1：建议本轮一起设计

1. `POST /api/upload/image`
2. `POST /api/analytics/analyze` 或 `POST /api/ai/chat`

这两个接口会影响：

- Mood Step 3 图片上传
- Mood Step 5 AI 分析结果

---

## 前端页面需要的接口

## 1. Dashboard

页面文件：

- `frontend/src/app/dashboard/page.tsx`

### 需要接口

### `GET /api/moods?limit=3`

用途：

- 拉取最近 3 条记录展示在首页

前端当前期望字段：

```json
[
  {
    "id": 1,
    "mood_type": "calm",
    "note": "下午终于把任务拆开了，心里轻了一点。",
    "created_at": "2026-04-27T10:00:00Z"
  }
]
```

最低可用字段：

- `id`
- `mood_type`
- `note`
- `created_at`

---

## 2. 情绪录入页

页面文件：

- `frontend/src/app/mood/page.tsx`

### Step 1-4 提交接口

### `POST /api/moods`

前端当前发送 payload：

```json
{
  "date": "2026-04-27",
  "mood_type": "calm",
  "intensity": 6,
  "tags": ["relationship", "study"],
  "note": "此刻我在想什么..."
}
```

说明：

- 前端现在已经按“数组 tags”来建模，不建议继续使用字符串存储。
- 如果后端暂时必须兼容旧库，可以在后端内部自行转 JSON 字符串，但接口层建议直接收数组。

推荐响应：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "id": 101,
    "date": "2026-04-27",
    "mood_type": "calm",
    "intensity": 6,
    "tags": ["relationship", "study"],
    "note": "此刻我在想什么...",
    "created_at": "2026-04-27T10:00:00Z",
    "updated_at": "2026-04-27T10:00:00Z"
  }
}
```

### 字段枚举建议

#### `mood_type`

- `happy`
- `calm`
- `anxious`
- `angry`
- `sad`
- `neutral`

#### `tags`

建议统一为这 8 个：

- `study`
- `work`
- `social`
- `relationship`
- `family`
- `health`
- `fun`
- `other`

注意：

- 旧前端里曾有 `love`，新页面已经统一成 `relationship`
- 旧计划里有“身体”，当前新页面和原型已统一为 `health`

---

## 3. 图片上传

### `POST /api/upload/image`

用途：

- Mood Step 3 图片模式

前端建议：

- `multipart/form-data`
- 字段名：`file`

推荐响应：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "url": "https://xxx/image.jpg",
    "filename": "image.jpg"
  }
}
```

后续有两种接法：

1. 上传成功后前端把 `image_urls` 一起提交到 `POST /api/moods`
2. 或后端直接在上传时创建临时资源 ID，再在 `POST /api/moods` 里引用

这轮建议先走第 1 种，最简单。

---

## 4. AI 分析

当前前端 Step 5 还是前端占位文案，等待接口接入。

### 方案 A：`POST /api/analytics/analyze`

请求：

```json
{
  "mood_type": "calm",
  "intensity": 6,
  "tags": ["relationship", "study"],
  "note": "此刻我在想什么..."
}
```

响应建议：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "summary": "你今天整体偏平静，但仍有一些隐性的疲惫。",
    "suggestion": "先降低一点任务切换频率，给自己一小段留白。",
    "music_mood": "calm"
  }
}
```

### 方案 B：`POST /api/ai/chat`

适合后续扩展成长对话，但当前 Day 3 只需要单次分析结果。

结论：

- Day 3 先做 `POST /api/analytics/analyze`
- `POST /api/ai/chat` 留到 Day 4 再做流式对话

---

## 推荐统一返回格式

`CLAUDE.md` 已经约定：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {}
}
```

请优先按这个统一。

注意：

- 当前老接口 `GET /api/moods` 返回的是数组本体，不是统一包裹格式
- 前端 Dashboard 目前做了兼容兜底
- 建议后续统一成包裹格式后，再让我回收前端解析逻辑

---

## 现有后端需要优先调整的点

### 1. `tags` 类型

当前后端模型还是字符串，不适合 Day 3 多选标签。

建议：

- 接口层改成 `list[str]`
- 数据库存储可用 PostgreSQL `JSONB`

### 2. 数据库方案

`CLAUDE.md` 指向 PostgreSQL，但当前仓库里还有 SQLite 痕迹。

建议：

- `workbuddy` 优先以 PostgreSQL 结构为目标设计
- 如果本地先临时跑 SQLite，也要保持接口字段一致

### 3. 上传接口缺失

当前前端已留入口，但未接真实上传逻辑。

---

## 建议联调顺序

1. 先改 `POST /api/moods` 的字段结构
2. 再改 `GET /api/moods` 返回最近记录
3. 然后补 `POST /api/upload/image`
4. 最后补 `POST /api/analytics/analyze`

---

## 前端当前已完成的兜底

- Dashboard：接口失败时会显示本地占位记录
- Mood 提交：接口失败时仍可进入 Step 5 占位结果
- 图片上传：已有文件选择 UI，但不依赖真实接口

这意味着：

- `workbuddy` 可以分阶段接，不需要一次性全补完

