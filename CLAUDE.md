# CLAUDE.md - MoodWave 灵音 项目上下文

## 项目概述

**项目名称**: MoodWave 灵音 — AI 情绪分析与可视化音乐治愈平台
**参赛背景**:
- 腾讯PCG 校园AI产品创意大赛 (开放赛道，初赛 5/6)
- 腾讯云 OpenClaw 玩虾大赛 (文章赛道·选题4，5/5 截止)
**核心理念**: Vibe Coding (AI 辅助开发，单人 7 天完成 MVP)
**开发周期**: 4/24（周五）→ 4/30（周四）

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/UI
- **后端**: Python FastAPI + SQLModel (保留 Python 后端，不迁移到 Next.js API Routes)
- **数据库**: PostgreSQL (Docker 部署，数据持久化，不使用 SQLite)
- **状态管理**: Zustand
- **图表可视化**: Recharts (折线图/饼图/热力图)
- **音乐可视化**: Tone.js + Canvas API + Web Audio API
- **AI 能力**: DeepSeek API (情绪分析 + 对话 Agent)
- **数据采集**: Hermes Agent (小红书情绪数据爬取)
- **部署方案**:
  - 主方案: 腾讯云轻量服务器 (Docker Compose: FastAPI + PostgreSQL + Nginx)
  - 备选: Vercel (前端自动部署) + CloudBase (静态托管)
- **其他**: PWA、响应式设计 (移动端适配)

## 项目结构

```
MoodWave/
├── frontend/                # Next.js 14 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing Page (首页)
│   │   │   ├── login/page.tsx        # 登录/注册
│   │   │   ├── dashboard/page.tsx    # 主仪表盘
│   │   │   ├── mood/page.tsx         # 情绪录入 (Step 1-5)
│   │   │   ├── analytics/page.tsx    # 情绪分析中心
│   │   │   ├── music/page.tsx        # 可视化音乐房间
│   │   │   ├── discovery/page.tsx    # 灵感广场 (社区)
│   │   │   └── profile/page.tsx      # 个人主页
│   │   ├── components/       # React 组件
│   │   ├── lib/              # API Client + 工具函数
│   │   ├── store/            # Zustand 状态管理
│   │   └── types/            # TypeScript 类型定义
│   ├── public/               # 静态资源 (icons, manifest.json)
│   └── package.json
├── backend/                 # Python FastAPI 后端
│   ├── src/
│   │   ├── main.py          # 应用入口 + CORS + 路由注册
│   │   ├── database.py      # PostgreSQL 连接配置
│   │   ├── models.py        # SQLModel 数据模型 (PostgreSQL)
│   │   ├── routers/
│   │   │   ├── moods.py     # 情绪 CRUD
│   │   │   ├── analytics.py # 情绪分析
│   │   │   ├── auth.py      # JWT 认证
│   │   │   ├── posts.py     # 社区帖子
│   │   │   ├── ai.py        # AI Agent (DeepSeek)
│   │   │   └── upload.py    # 文件上传
│   │   └── services/
│   │       ├── ai_service.py    # DeepSeek API 调用
│   │       └── hermes_service.py # Hermes Agent 数据采集
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml       # FastAPI + PostgreSQL + Nginx 编排
├── nginx.conf               # Nginx 反向代理配置
├── CLAUDE.md                # 本文件 (AI Coding 上下文)
├── 7天冲刺计划.md            # 开发计划
└── 问卷题目设计.md           # 腾讯问卷内容
```

## 核心功能模块

### 1. 情绪录入 (Mood Entry) — 分步引导式
- Step 1: 情绪选择 (6种: happy/calm/anxious/angry/sad/neutral)
- Step 2: 强度滑块 (1-10，渐变色)
- Step 3: 多媒体输入
  - 文字描述 (支持 Markdown)
  - 📷 图片上传 (最多3张，存本地/COS)
  - 🎥 视频上传 (最长30秒)
  - 🎤 语音输入 (录音 → Whisper 转文字)
- Step 4: 标签选择 (学习/工作/社交/情感/身体/其他)
- Step 5: AI 分析结果展示 (DeepSeek) + 自动跳转音乐页

### 2. 情绪分析中心 (Analytics)
- 30天情绪趋势折线图 (Recharts)
- 情绪类型分布饼图
- 高频关键词词云
- 年度情绪热力日历 (GitHub 风格)
- AI 月度洞察报告 (DeepSeek 生成)
- 最高光 vs 最低谷时刻对比

### 3. 可视化音乐房间 (Music Visualization)
- 情绪 → 音频参数映射 (开心=明快节奏, 悲伤=低频慢速)
- Web Audio API AnalyserNode 获取频段数据
- Canvas 粒子随节奏跳动 + 波纹扩散
- 颜色随情绪变化 (Neon Moods 配色)
- Tone.js Synth 生成氛围音乐

### 4. AI 情绪智能体 (Agent)
- DeepSeek API 接入
- 输入: 用户情绪日记 + 历史数据
- 输出: 个性化情绪洞察 + 同理心对话 + 调节建议
- Prompt 风格: 温暖、有同理心、有深度
- 流式响应 (SSE)

### 5. 灵感广场 (Discovery / 社区)
- 帖子流 (瀑布流卡片布局)
- 点赞/评论交互
- 标签筛选 (全部/学习/情感/树洞)
- 匿名发布开关
- 可以把当天日记发布到广场

### 6. 个人主页 (Profile)
- 情绪统计摘要
- 历史记录列表 (可按日期/情绪筛选)
- ⚡ 快乐能量库 (高光时刻)
- 📅 心境清单 (任务+情绪关联)
- 设置 (头像/昵称/通知)

## API 设计

### 核心端点

```
# 用户认证
POST   /api/auth/register     # 注册
POST   /api/auth/login        # 登录 (返回 JWT)
GET    /api/auth/me           # 当前用户信息

# 情绪记录
POST   /api/moods             # 创建情绪记录 (含图片/视频)
GET    /api/moods             # 获取情绪列表 (?user_id=&date_range=)
GET    /api/moods/{id}        # 获取单条记录
PUT    /api/moods/{id}        # 更新记录
DELETE /api/moods/{id}        # 删除记录

# 情绪分析
POST   /api/analytics/analyze # AI 情感分析 (输入文本 → 返回情绪+强度+关键词)
GET    /api/analytics/weekly  # 周期趋势
GET    /api/analytics/summary # 汇总统计

# AI Agent
POST   /api/ai/chat           # 情绪对话 (流式响应 SSE)

# 社区
POST   /api/posts             # 发帖
GET    /api/posts             # 帖子列表 (?tag=&page=)
POST   /api/posts/{id}/like   # 点赞
POST   /api/posts/{id}/comment # 评论

# 文件上传
POST   /api/upload/image      # 图片上传
POST   /api/upload/video      # 视频上传
POST   /api/upload/audio      # 语音上传

GET    /api/music/recommend   # 音乐推荐
GET    /api/health            # 健康检查
```

## 数据模型

### User
```python
- id: int (主键, PostgreSQL SERIAL)
- email: str (邮箱，唯一)
- username: str (昵称)
- hashed_password: str
- avatar_url: str (可选)
- mbti: str (可选, MBTI 人格类型)
- created_at: datetime
```

### MoodEntry
```python
- id: int (主键, PostgreSQL SERIAL)
- user_id: int (外键 → User)
- mood_type: str (happy/calm/anxious/angry/sad/neutral)
- intensity: int (1-10)
- tags: list[str] (JSONB)
- note: str (文字描述)
- images: list[str] (图片URL列表，JSONB)
- video_url: str (可选)
- is_shared: bool (是否分享到广场)
- created_at: datetime
- updated_at: datetime
```

### Post
```python
- id: int (主键, PostgreSQL SERIAL)
- user_id: int (外键 → User)
- mood_id: int (可选，关联某条情绪记录)
- content: str
- is_anonymous: bool
- likes_count: int
- created_at: datetime
```

## Docker Compose 部署

```yaml
# docker-compose.yml 核心结构
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data  # 数据持久化，容器重启不丢
    environment:
      POSTGRES_DB: moodwave
      POSTGRES_USER: moodwave
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://moodwave:${DB_PASSWORD}@db:5432/moodwave
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  pgdata:  # 命名卷，数据永久保存
```

## 设计规范

- **视觉风格**: Cyber-Healing (赛博治愈)，Glassmorphism 2.0
- **底色**: `#050505`，容器 `rgba(25,25,25,0.6)` + `backdrop-blur(24px)`
- **情绪色彩 (Neon Moods)**:
  - Happy: `#FFD93D → #FF9800` (金橙)
  - Calm: `#9D84B7 → #6366F1` (丁香紫)
  - Anxious: `#4D96FF → #06B6D4` (极光蓝)
  - Angry: `#FF6B6B → #DC2626` (熔岩红)
  - Sad: `#6BCB77 → #10B981` (翡翠绿)
  - Neutral: `#A8DADC → #94A3B8` (岩灰)
- **字体**: 标题 Outfit/Montserrat，正文 Sora，中文 PingFang SC
- **动效**: Framer Motion (页面切换)，CSS 渐变流体背景

## 响应式适配策略

- 默认: 手机端布局
- `md:` (768px+): 平板
- `lg:` (1024px+): PC 侧边栏
- 侧边栏: PC左侧固定，手机变成底部导航栏
- 卡片: 手机1列，平板2列，PC3列

## 编码规范

- 所有 API 返回统一格式: `{ code: int, msg: str, data: any }`
- Python 用 type hints，Pydantic/SQLModel 做数据校验
- 前端组件 PascalCase，文件 kebab-case
- 中文注释，变量名英文
- 每个页面组件保持 < 300 行，复杂逻辑抽到 hooks/services
- 数据库字段用 PostgreSQL 原生类型 (JSONB 而非 SQLite JSON)

## 7天冲刺计划 (4/24-4/30)

1. **Day 1 (4/24 周五)**: 情绪调查问卷制作分发 + 项目环境搭建 + 前后端启动
2. **Day 2 (4/25 周六)**: Landing Page + 登录页 + Dashboard 主页
3. **Day 3 (4/26 周日)**: 情绪录入页完整流程 (Step 1-5 + AI 分析)
4. **Day 4 (4/27 周一)**: 可视化音乐 + AI 情绪分析接口
5. **Day 5 (4/28 周二)**: 数据分析中心 + 灵感广场 (社区)
6. **Day 6 (4/29 周三)**: 个人主页 + PWA + 响应式 + 整合
7. **Day 7 (4/30 周四)**: 部署上线 + 比赛材料准备 (PCG + OpenClaw)

## 重要提示

- **数据库必须用 PostgreSQL**，不用 SQLite（SQLite 在 Docker 容器重启后数据丢失）
- Docker 部署时使用命名卷 (named volume) 持久化 PostgreSQL 数据
- 本地开发可用 SQLite，但部署前必须切换到 PostgreSQL 测试
- 问卷数据 (150+ 份) 是 PCG 比赛的核心竞争力，Day 1 必须发出
- MVP 优先: 先跑通流程，再优化体验
- 每天结束前 git commit 保存进度
- 爬取的小红书数据不要公开分享，注意用户隐私
- OpenClaw 玩虾大赛文章: 边开发边截图，记录 prompt → 代码 → 效果的完整过程
- AI 工具分工: WorkBuddy 主力写代码 + v0.dev 生成 UI + DeepSeek 做分析 + OpenClaw 截图写文章
