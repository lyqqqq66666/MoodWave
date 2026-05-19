# MoodWave 灵音伙伴 — 情绪陪伴型 AI Agent 技术方案

> **参赛赛道**：赛道一 · 趣味灵感Agent
> **作品名称**：MoodWave 灵音 — 情绪陪伴型 AI Agent
> **团队信息**：[团队名称] / [成员姓名]
> **提交日期**：2026-05-15

> **一句话简介**：MoodWave 灵音伙伴以 LangGraph 编排“情绪理解、长期记忆、共情回复、音乐疗愈”流程，让 AI 不只是回答问题，而是能理解用户状态、记住用户线索并持续陪伴的情绪 Agent。

---

## 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [Agent 核心设计](#三agent-核心设计)
4. [关键技术创新](#四关键技术创新)
5. [实现细节](#五实现细节)
6. [系统界面与运行效果](#六系统界面与运行效果)
7. [演示场景](#七演示场景)
8. [技术亮点总结](#八技术亮点总结)
9. [当前边界与迭代计划](#九当前边界与迭代计划)

---

## 一、项目概述

### 1.1 项目背景

现代大学生面临学业、就业、人际关系等多重压力，情绪问题日益突出。传统的心理咨询服务存在资源有限、隐私顾虑、使用门槛高等问题。MoodWave 灵音伙伴旨在通过 AI Agent 技术，为用户提供一个**7×24 小时、个性化、有温度**的情绪陪伴服务。

### 1.2 核心定位

**灵音伙伴 = 情绪陪伴型 AI Agent**

不同于单轮问答式聊天机器人，灵音伙伴具备“状态感知 + 记忆检索 + 个性化生成 + 后续疗愈建议”的 Agent 闭环能力：

| 能力维度 | 具体表现 |
|----------|----------|
| **情绪感知** | 多模态输入（文字/语音/图片）→ 情绪识别 → 情绪分类 |
| **长期记忆** | 跨会话记忆存储与检索，记住用户的情绪模式和偏好 |
| **个性化陪伴** | 7 种角色人设 × MBTI × 星座 = 千人千面的陪伴风格 |
| **疗愈反馈** | 情绪分析 → 音乐推荐 → 可视化音乐播放 → 情绪疗愈闭环 |
| **Agent 编排** | LangGraph 状态图编排 8 个处理节点，将一次对话拆成可追踪、可降级、可扩展的任务链 |

### 1.3 评审维度适配

| 评审维度 | 权重 | 本方案对应亮点 |
|----------|------|----------------|
| **创新性** | 20% | LangGraph 8 节点状态图编排、情绪-音乐参数映射、跨会话长期记忆 |
| **效率** | 15% | SSE 流式体验、会话历史持久化、近期上下文窗口控制 |
| **鲁棒性** | 15% | LangGraph 不可用时自动顺序降级、异常兜底回复、前后端超时控制 |
| **实用价值** | 20% | 面向大学生情绪记录与陪伴场景，形成“记录-对话-音乐疗愈-记忆沉淀”闭环 |
| **人机交互** | 15% | 多角色形象、动态欢迎语、历史会话、可折叠 Agent 过程、音乐推荐卡片 |
| **展示效果** | 15% | 完整 Demo、5 分钟视频可展示全流程 |

---

## 二、技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js 14)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Dashboard │ │   Mood   │ │ Companion│ │  Music   │           │
│  │  情绪看板  │ │ 情绪记录  │ │ 灵音伙伴  │ │ 音乐可视化│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                          │                                       │
│                    SSE 流式连接                                   │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    后端层 (FastAPI)                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   API 路由层                                │ │
│  │  /api/ai/chat  /api/ai/chat-agent  /api/companion/*       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Agent 编排层 (LangGraph)                       │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │ │
│  │  │ load_  │ │ load_  │ │ load_  │ │classify│              │ │
│  │  │profile │ │ mood   │ │memories│ │emotion │              │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘              │ │
│  │       ↓         ↓          ↓           ↓                   │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │ │
│  │  │generate│ │recommend│ │extract │ │ save   │              │ │
│  │  │ reply  │ │ music  │ │memories│ │memories│              │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   服务层                                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │  AI Service  │ │ Companion    │ │   Music      │       │ │
│  │  │ (DeepSeek)   │ │   Agent      │ │  Service     │       │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   数据层                                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │  SQLite/     │ │  Companion   │ │  Companion   │       │ │
│  │  │  PostgreSQL  │ │ Conversation │ │   Memory     │       │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选型 | 选型理由 |
|------|----------|----------|
| **前端** | Next.js 14 + TypeScript + Tailwind | App Router 支持 SSR/SSG，TypeScript 类型安全 |
| **后端** | Python FastAPI + SQLModel | 异步高性能，自动 API 文档，ORM 简洁 |
| **Agent** | LangGraph StateGraph + DeepSeek | 状态图编排多节点流程，DeepSeek 负责共情回复生成 |
| **音乐** | Tone.js + Web Audio API | 浏览器端音频合成与可视化 |
| **数据库** | SQLModel + PostgreSQL/SQLite 兼容 | 本地开发轻量，部署时可切换 PostgreSQL 持久化 |

---

## 三、Agent 核心设计

### 3.1 LangGraph 状态图编排

灵音伙伴的核心是基于 **LangGraph StateGraph** 的 8 节点 Agent 编排。每次用户发送消息后，后端会构造一个 `AgentState`，由各节点逐步补充用户画像、情绪记录、长期记忆、回复、音乐参数和记忆保存结果。

```python
# backend/src/services/companion_agent.py

class AgentState(TypedDict, total=False):
    """Agent 状态定义 — 节点间共享的状态容器"""
    # 输入
    user_id: int
    user_message: str
    mood_type: str
    intensity: int
    tags: list[str]
    conversation_id: int | None
    history: list[dict]
    avatar_character: str
    mbti: str
    zodiac: str

    # 节点输出
    user_profile: dict
    today_mood: dict | None
    recent_moods: list[dict]
    relevant_memories: list[dict]
    emotion_analysis: dict
    reply: str
    music_recommendation: dict
    memory_candidates: list[dict]
    saved_memory_ids: list[int]
    agent_status: str
    nodes_executed: list[str]
    status_messages: list[str]
```

### 3.2 八节点处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     LangGraph Agent 流程                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ① load_profile ──→ ② load_mood ──→ ③ load_memories           │
│         │                  │                │                    │
│         ↓                  ↓                ↓                    │
│   读取用户资料       获取今日情绪       检索长期记忆              │
│   (MBTI/星座)       (最近情绪记录)     (最近10条)                │
│                                                                 │
│                            ↓                                    │
│                                                                 │
│   ④ classify_emotion ──→ ⑤ generate_reply                      │
│         │                       │                               │
│         ↓                       ↓                               │
│   规则加权情绪识别       构建prompt+生成回复                    │
│   (mood/intensity)       (API层SSE逐字推送)                     │
│                                                                 │
│                            ↓                                    │
│                                                                 │
│   ⑥ recommend_music ──→ ⑦ extract_memories ──→ ⑧ save_memories │
│         │                       │                    │          │
│         ↓                       ↓                    ↓          │
│   情绪→音乐参数映射      提取记忆候选         保存到数据库       │
│   (BPM/energy/style)    (event/habit等)      (CompanionMemory)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 节点详细说明

| 节点 | 功能 | 输入 | 输出 | 耗时 |
|------|------|------|------|------|
| **① load_profile** | 加载用户资料 | user_id | profile, mbti, zodiac, character | ~50ms |
| **② load_mood** | 获取今日情绪 | user_id | today_mood, recent_moods | ~30ms |
| **③ load_memories** | 检索长期记忆 | user_id, character | relevant_memories | ~40ms |
| **④ classify_emotion** | 情绪分类 | user_message, mood_type, intensity, tags | emotion_analysis, mood_type, intensity | ~50ms |
| **⑤ generate_reply** | 生成共情回复 | 用户画像、情绪、记忆、历史消息 | reply | ~2-5s |
| **⑥ recommend_music** | 音乐参数推荐 | mood_type, intensity | music_recommendation | ~50ms |
| **⑦ extract_memories** | 提取记忆候选 | 用户消息、近期情绪、标签 | memory_candidates | ~50ms |
| **⑧ save_memories** | 保存记忆 | memory_candidates | saved_memory_ids | ~100ms |

> 说明：当前实现中，`generate_reply` 节点调用 DeepSeek 一次性生成完整回复，API 层再通过 SSE 逐字推送给前端，兼顾 Agent 状态完整性与用户侧流式体验。

### 3.4 降级机制

```python
async def run_companion_agent(user_id, conversation_id, user_message, ...):
    """Agent 主入口 — 带降级机制"""
    if _compiled_graph is not None:
        try:
            return await _compiled_graph.ainvoke(initial_state)
        except Exception:
            return await _fallback_sequential(initial_state)

    return await _fallback_sequential(initial_state)
```

降级执行仍然会按同样的 8 个节点顺序返回 `reply`、`music_recommendation`、`memory_refs`、`nodes_executed` 等结构，因此前端无需感知 LangGraph 是否临时不可用。

---

## 四、关键技术创新

### 4.1 情绪-音乐映射算法

```python
def recommend_music_params(mood_type: str, intensity: int = 5) -> dict:
    """基于情绪的音乐参数映射"""
    MUSIC_PARAMS = {
        "happy":   {"bpm": 120, "energy": "high",   "style": "pop"},
        "calm":    {"bpm": 70,  "energy": "low",    "style": "ambient"},
        "anxious": {"bpm": 80,  "energy": "medium", "style": "lo-fi"},
        "angry":   {"bpm": 90,  "energy": "medium", "style": "electronic"},
        "sad":     {"bpm": 65,  "energy": "low",    "style": "classical"},
        "neutral": {"bpm": 85,  "energy": "medium", "style": "chill"},
    }
    # 根据情绪强度调整 BPM：
    # intensity >= 8 时加快 10 BPM，intensity <= 3 时放慢 10 BPM
    # ...
```

### 4.2 长期记忆检索与沉淀

```python
def get_companion_memories(user_id: int, character: str = "cat", limit: int = 10):
    """读取用户最近的长期记忆，注入 generate_reply 节点上下文"""
    ...

def save_companion_memories_batch(user_id: int, memories: list[dict], source: str = "ai"):
    """将本轮对话提取出的记忆候选批量保存"""
    ...
```

当前版本以“最近记忆 + 结构化类型”为主，支持 `personality / preference / habit / event` 四类记忆，并记录 `mood_context` 与 `tags`。后续可进一步升级为向量检索或“情绪相关度 + 新鲜度 + 记忆类型”的综合排序。

### 4.3 七角色人设系统

| 角色 | 名称 | 性格特征 | 语言风格 |
|------|------|----------|----------|
| cat | 小喵 | 温柔治愈 | 轻柔、关心、可爱陪伴感 |
| fox | 小狐狸 | 聪慧幽默 | 俏皮、智慧、善于帮用户理线索 |
| planet | 小星球 | 沉稳理性 | 理性分析、鼓励成长 |
| sunny | 阳光少年 | 积极乐观 | 活力、正向鼓励、行动建议 |
| astronaut | 小宇航员 | 探索好奇 | 冒险精神、发现新视角 |
| moon | 月光伙伴 | 安静陪伴 | 静谧、理解、不说教 |
| sakura | 小樱 | 温暖治愈 | 甜美、共情、小确幸 |

---

## 五、实现细节

### 5.1 数据模型

```python
class CompanionConversation(SQLModel, table=True):
    """会话表"""
    id: int
    user_id: int
    title: str = ""
    character: str = "cat"  # 7 角色之一
    created_at: datetime
    updated_at: datetime

class CompanionMessage(SQLModel, table=True):
    """消息表"""
    id: int
    conversation_id: int
    user_id: int
    role: str  # user / assistant
    content: str
    mood_type: str | None
    extra_data: str  # JSON 字符串，预留扩展字段
    created_at: datetime

class CompanionMemory(SQLModel, table=True):
    """记忆表"""
    id: int
    user_id: int
    content: str
    source: str = "ai"  # ai / rules
    memory_type: str = "personality"  # personality / preference / habit / event
    mood_context: str | None
    tags: str  # JSON 字符串
    created_at: datetime
    updated_at: datetime
```

### 5.2 核心 API 接口

| 接口 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/api/companion/greeting` | GET | 动态欢迎语 | character |
| `/api/companion/conversations` | POST | 创建会话 | character, title |
| `/api/companion/conversations` | GET | 会话列表 | — |
| `/api/companion/conversations/{id}` | PATCH | 重命名会话 | title |
| `/api/companion/conversations/{id}` | DELETE | 删除会话 | — |
| `/api/companion/conversations/{id}/messages` | GET | 消息历史 | — |
| `/api/companion/conversations/{id}/messages-agent` | POST | Agent 消息 | content, mood_type, intensity, tags |
| `/api/companion/memories` | GET | 记忆列表 | memory_type, limit |
| `/api/companion/memories/generate` | POST | 生成记忆 | — |
| `/api/ai/chat-agent` | POST | Agent 对话 | message, conversation_id |
| `/api/ai/agent-status` | GET | Agent 状态 | — |

### 5.3 SSE 流式响应设计

```python
async def send_message_agent(conversation_id, content, user_id):
    """Agent 模式消息发送 — SSE 流式"""
    # 1. 保存用户消息
    # 2. 启动 Agent 执行
    # 3. 流式返回事件：
    #    - {"type": "status", "content": "..."} → Agent 节点状态更新
    #    - {"type": "text", "content": "..."}   → AI 回复逐字流
    #    - {"type": "music", "content": {...}}  → 音乐推荐参数
    #    - {"type": "done", "content": {...}}   → 完成（含 assistant_message_id）
    #    - {"type": "error", "content": "..."}  → 错误信息
```

### 5.4 前端交互流程

```
用户输入 → POST /messages-agent → SSE 连接 → 实时展示
                                              ↓
                                    ┌─────────────────┐
                                    │ 状态 ① load_profile │ → "正在加载资料..."
                                    │ 状态 ② load_mood    │ → "正在分析情绪..."
                                    │ ...                 │
                                    │ text "你"           │ → 逐字显示回复
                                    │ text "好"           │
                                    │ text "呀"           │
                                    │ music {...}         │ → 绑定到当前回复下方
                                    │ done                │ → 更新消息 ID 与时间
                                    └─────────────────┘
```

前端默认只展示轻量状态条，用户点击后才展开 `nodes_executed` 等 Agent 过程信息，避免把内部工作流直接暴露为干扰性的主界面元素。

---

## 六、系统界面与运行效果

> 本章节用于放置实际平台截图，证明项目已具备可运行、可交互、可演示的产品形态。正式提交 PDF 时建议每张截图下保留 1-2 行说明，突出 Agent 能力而不是单纯展示页面。

### 6.1 灵音伙伴主界面

> 截图位置：展示伙伴形象、动态欢迎语、对话 Tab、装扮 Tab、记忆 Tab、历史会话入口。

【截图 1：灵音伙伴主界面】

建议说明：用户进入灵音伙伴页面后，系统会结合当天情绪记录或当前伙伴形象生成动态问候；用户可以在同一页面完成对话、装扮和记忆查看。

### 6.2 Agent 对话与状态反馈

> 截图位置：展示用户输入、伙伴流式回复、消息时间、轻量 Agent 状态条。

【截图 2：Agent 对话过程】

建议说明：用户发送消息后，后端通过 LangGraph 执行 8 节点工作流，前端通过 SSE 展示实时回复；Agent 内部过程默认折叠，既保留技术可解释性，也避免干扰普通用户。

### 6.3 音乐推荐卡片

> 截图位置：展示伙伴回复下方的音乐推荐卡片，包括 BPM、能量、风格、情绪标签。

【截图 3：音乐推荐卡片】

建议说明：Agent 会根据识别出的情绪类型和强度生成音乐参数，将“情绪理解”进一步转化为可执行的疗愈建议。

### 6.4 历史会话管理

> 截图位置：展示历史会话列表、会话切换、重命名、删除入口。

【截图 4：历史会话管理】

建议说明：灵音伙伴支持多会话管理，用户可以为不同主题建立独立对话，并对历史会话进行重命名和删除。

### 6.5 长期记忆系统

> 截图位置：展示记忆分类列表、记忆时间、情绪分类、记忆详情弹窗。

【截图 5：长期记忆系统】

建议说明：Agent 会从情绪记录和伙伴对话中沉淀长期记忆，并按时间、类型和情绪上下文展示，支持用户点击查看完整内容。

### 6.6 情绪记录与音乐疗愈闭环

> 截图位置：展示情绪录入页面、情绪分析结果、音乐可视化页面。

【截图 6：情绪记录与音乐疗愈闭环】

建议说明：MoodWave 不止提供聊天回复，还将用户的情绪记录、Agent 陪伴和音乐可视化连接成完整体验闭环。

---

## 七、演示场景

### 场景 1：情绪记录 → Agent 陪伴

```
1. 用户在 Dashboard 记录今日情绪："今天被导师批评了，很沮丧"
2. 进入灵音伙伴页面
3. Agent 自动读取今日情绪，生成个性化欢迎语：
   "小喵感知到你今天心情不太好呢...想聊聊发生了什么吗？喵~"
4. 用户输入："导师说我论文写得太差了"
5. Agent 执行 8 节点流程：
   - 情绪分类：sad，强度 5/10，命中关键词"沮丧"
   - 生成共情回复
   - 推荐舒缓音乐 (BPM 65, classical)
6. 前端展示音乐推荐卡片，并可进入音乐可视化页面继续调节情绪
```

### 场景 2：长期记忆 → 个性化成长

```
1. 第一次对话：用户提到"我害怕公开演讲"
2. Agent 提取记忆并保存
3. 第 N 次对话：用户提到"明天要做 presentation"
4. Agent 检索到相关记忆："我记得你之前提到过害怕公开演讲..."
5. 提供针对性的鼓励和建议
6. 体现 Agent 的长期记忆能力
```

### 场景 3：多角色切换

```
1. 用户选择"小狐狸"角色
2. Agent 语言风格切换为俏皮幽默
3. 用户选择"月光伙伴"
4. Agent 语言风格切换为安静陪伴
5. 体现 7 角色人设的差异化体验
```

---

## 八、技术亮点总结

### 7.1 架构创新

| 亮点 | 说明 |
|------|------|
| **LangGraph 状态图** | 8 节点有向图编排，节点可独立测试、独立替换 |
| **Agent 降级机制** | LangGraph 异常时自动降级为顺序执行，保证服务可用 |
| **SSE 流式架构** | 状态更新 + 文本流 + 音乐推荐三路复用，实时性好 |
| **长期记忆沉淀** | 对话后自动提取候选记忆，按类型、情绪上下文和标签结构化保存 |

### 7.2 应用价值

| 亮点 | 说明 |
|------|------|
| **真实场景** | 解决大学生情绪陪伴刚需，非 demo 级项目 |
| **完整 MVP 闭环** | 前端、后端、Agent、记忆和音乐推荐已形成可演示流程 |
| **多模态输入** | 支持文字、语音、图片三种情绪表达方式 |
| **疗愈闭环** | 情绪识别 → 共情回复 → 音乐推荐 → 可视化播放 |

### 7.3 技术深度

| 亮点 | 说明 |
|------|------|
| **7 角色 × MBTI × 星座** | 动态 system prompt 构建，千人千面 |
| **结构化记忆提取** | 对话线索 → memory_type/mood_context/tags → 持久化 → 下轮检索 |
| **情绪-音乐映射** | 基于情绪类别和强度调整 BPM/Energy/Style 参数 |
| **超时对齐** | 前后端超时严格对齐，避免"无限转圈" |

---

## 九、当前边界与迭代计划

### 9.1 当前边界

| 边界 | 当前处理 |
|------|----------|
| Agent 流程 | 当前为 8 节点线性 LangGraph，尚未引入条件分支和循环反思 |
| 记忆检索 | 当前按最近记忆读取，尚未接入向量数据库 |
| 情绪分类 | 当前以规则分类和前端情绪输入加权为主，回复生成由 DeepSeek 完成 |
| 音乐推荐 | 当前输出音乐参数和推荐卡片，后续可进一步联动真实曲库 |

### 9.2 下一步增强

| 方向 | 计划 |
|------|------|
| 条件分支 | 根据情绪风险程度分流：普通陪伴、深度安抚、建议寻求现实支持 |
| 记忆检索 | 引入 embedding + 向量检索，实现更精准的跨会话回忆 |
| 工具调用 | 将音乐推荐、情绪趋势分析、记忆更新封装为可选择工具 |
| 可观测性 | 展示节点耗时、失败节点、降级状态，增强 Agent 工程可信度 |

---

## 附录

### A. 项目文件结构

```
moodwave/
├── frontend/                    # Next.js 前端
│   ├── src/app/                # App Router 页面
│   │   ├── companion/          # 灵音伙伴页面
│   │   ├── mood/               # 情绪记录流程
│   │   └── dashboard/          # 情绪看板
│   └── src/components/         # 组件库
│
├── backend/                     # FastAPI 后端
│   ├── src/
│   │   ├── api/                # API 路由
│   │   │   ├── ai.py           # AI 接口（chat/chat-agent/greeting）
│   │   │   └── companion.py    # 伙伴接口（会话/消息/记忆 CRUD）
│   │   ├── services/           # 业务逻辑
│   │   │   ├── companion_agent.py  # LangGraph Agent 编排
│   │   │   ├── companion_tools.py  # Agent 工具函数
│   │   │   └── ai_service.py       # DeepSeek 调用封装
│   │   └── core/
│   │       └── models.py       # 数据模型（Companion* 三表）
│   └── .env                    # API Key 配置
│
└── docs/                        # 文档
```

### B. 竞赛提交材料

- [x] 技术方案文档（本文）
- [ ] Demo 视频（≤5 分钟）
  - 0:00-0:30 项目介绍
  - 0:30-1:30 Agent 架构演示（8 节点流程）
  - 1:30-3:00 完整对话演示（情绪记录 → 陪伴对话 → 音乐推荐）
  - 3:00-4:00 多角色切换演示
  - 4:00-5:00 技术亮点总结

### C. 参考资料

- LangGraph 官方文档：https://langchain-ai.github.io/langgraph/
- DeepSeek API 文档：https://platform.deepseek.com/api-docs
- Tone.js 音频库：https://tonejs.github.io/
- Web Audio API：https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**文档版本**：v1.0
**最后更新**：2026-05-14
