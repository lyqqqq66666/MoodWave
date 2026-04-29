# Codex 前端 UI 打磨任务

> 生成时间：2026-04-29 22:19
> 优先级：P0 → P1 → P2 → P3 顺序执行
> 原则：让网站看起来像一个完成的产品，而不是原型/脚手架

---

## 修复原则（5 条铁律）

1. **不能点击的按钮必须给反馈**：要么实现功能，要么 disabled + "功能开发中" 提示，绝不能点而无反应
2. **所有用户可见文字必须是产品文案**：零 API 路径、零技术术语、零"占位/Mock/接口"字样
3. **页面切换保持视觉稳定**：表单高度统一、过渡动画流畅
4. **用户数据必须真实**：头像、用户名从 auth store 读取，不硬编码
5. **图标统一精致**：不再混用 emoji 和 lucide，统一视觉语言

---

## P0 — 必须修（假按钮 + 开发痕迹清理）

### 任务 1：Landing 页（`frontend/src/app/page.tsx`）

- [ ] **"查看原型首页" 按钮**：改为"立即开始"，链接改为 `/login`（未登录用户也能到达）
- [ ] **右侧预览卡片**（🎤📊🎵🤝）：4 个 `<div>` 改为 `<Link>`，分别跳转到：
  - 🎤 说说此刻的心情 → `/mood`
  - 📊 我的趋势 → `/analytics`
  - 🎵 治愈音乐 → `/music`
  - 🤝 解忧角 → `/discovery`
- [ ] **"78.1% 的大学生每周都会经历负面情绪" 徽章**：保留数据但去掉悬浮感（改为静态展示，或加来源标注）

### 任务 2：Login 页（`frontend/src/app/login/page.tsx`）

- [ ] **"忘记密码？" 按钮**：点击弹 toast "该功能正在开发中，敬请期待"
- [ ] **微信/Apple/Google 第三方登录按钮**：加 `disabled` 状态 + 底部小字 "第三方登录即将上线"，或加 tooltip 提示
- [ ] **删除开发文字**："移动端优先体验已经准备好，今晚的感受可以继续留在这里。" → 改为 "登录后继续你的情绪之旅"

### 任务 3：Dashboard 页（`frontend/src/app/dashboard/page.tsx`）

- [ ] **删除所有开发提示文字**：
  - 删除 "展示 `GET /api/moods` 的最新记录，接口未就绪时用本地占位数据。"
  - 删除 "这里先由前端根据时间与当前情绪做文案占位，后续交给 `workbuddy` 接接口。"
  - 删除整个虚线框 "联调接口建议：`GET /api/moods` 返回最近 3 条记录..."
- [ ] **通知铃铛**（`moodwave-shell.tsx:100-103`）：点击弹 toast "暂无新通知"
- [ ] **"温柔模式进行中" 徽章**：点击弹 toast "温柔模式功能开发中"

### 任务 4：Mood 情绪录入页（`frontend/src/app/mood/page.tsx`）

- [ ] **删除"接口预留"侧边栏区块**（含 3 条 `POST /api/...` 文字），整块删掉
- [ ] **清理开发文字**：
  - "文字先落地，图片和语音先保留前端入口给后续接口。" → "用文字、图片或语音记录此刻"
  - "后续由 `POST /api/upload/image` 接入" → 删除
  - "先完成 UI 和状态流，录音转文字由后续接口接入。" → "语音功能即将上线"
  - "提交已经完成。当前页面先展示前端占位分析，后续可由 AI 接口替换。" → "情绪分析完成"
  - "准备就绪后会提交到 `POST /api/moods`，再进入分析结果。" → "正在分析你的情绪波纹"
- [ ] **图片上传**：保留 UI 入口，点击弹 toast "图片上传功能即将上线"
- [ ] **语音输入**：保留 UI 入口，点击弹 toast "语音功能即将上线"

### 任务 5：Analytics 分析页（`frontend/src/app/analytics/page.tsx`）

- [ ] **删除 "接口已连接" / "Mock 数据" 标签**
- [ ] **月份翻页按钮**：实现月份切换显示（即使数据不变，至少月份文字要跟着变）

### 任务 6：Discovery 解忧角（`frontend/src/app/discovery/page.tsx`）

- [ ] **删除开发文字**：
  - "接口不可用时使用本地数据。" → "温柔回应，不评判"
  - "已接入 `GET /api/posts`。" / "当前显示 Mock 数据。" → 删除，或改为 "实时更新"

### 任务 7：Music 音乐页（`frontend/src/app/music/page.tsx`）

- [ ] **删除开发文字**：
  - "Canvas 粒子正在跟随情绪节奏呼吸" → 删除或简化为 "跟随你的情绪呼吸"
  - "来自 DeepSeek SSE 流式回复" → 改为 "AI 陪伴建议"

---

## P1 — 应该修（数据真实 + 交互完善）

### 任务 8：Profile 读真实用户数据（`frontend/src/app/profile/page.tsx`）

- [ ] **头像**：从 `useAuthStore().user?.avatar_url` 读取，无头像时用默认头像 SVG（不要用 👧 emoji）
- [ ] **用户名**：从 `useAuthStore().user?.username` 读取，替换硬编码 "小鱼"
- [ ] **如果 user 为 null**：调用 `fetchMe()` 拉取一次

> auth store 在 `frontend/src/store/auth.ts`，字段：`{ id, email, username, avatar_url, mbti, created_at }`

### 任务 9：Profile 设置项（`frontend/src/app/profile/page.tsx`）

- [ ] "个人信息"、"通知设置"、"主题设置"、"使用指南"、"关于我们" 5 个按钮 → 点击弹 toast "功能开发中"
- [ ] **退出登录**：Profile 页的退出按钮和侧边栏退出逻辑统一，不要出现两个退出入口。建议 Profile 页退出按钮删除，只保留侧边栏的

### 任务 10：Login 登录/注册切换跳动（`frontend/src/app/login/page.tsx`）

- [ ] 表单区域设统一 `min-h-[460px]` 或类似值，确保登录/注册两种模式高度一致
- [ ] 切换时加 `transition-all duration-300` 平滑过渡

---

## P2 — 布局优化

### 任务 11：侧边栏退出登录位置（`frontend/src/components/moodwave-shell.tsx`）

- [ ] 退出按钮 `sticky bottom-0` 固定在侧边栏底部，不随内容滚动
- [ ] 上方内容区可滚动，底部退出按钮始终可见

### 任务 12：底部导航优化（`frontend/src/components/moodwave-shell.tsx`）

- [ ] 手机端导航改为 **lucide 图标 + 极简文字**（2-3 字），确保窄屏不截断
- [ ] 当前 emoji（🏠✏️📈🎵🤝👤）全部换掉，对应关系：
  - 🏠 首页 → `<Home />` + "首页"
  - ✏️ 记录 → `<PenLine />` + "记录"
  - 📈 趋势 → `<TrendingUp />` + "趋势"
  - 🎵 音乐 → `<Music />` + "音乐"
  - 🤝 解忧 → `<HeartHandshake />` + "解忧"
  - 👤 我的 → `<User />` + "我的"

---

## P3 — 美化

### 任务 13：Logo 重设计（`frontend/src/components/moodwave-logo.tsx`）

- [ ] 当前 CSS 渐变线 logo 辨识度低，重新设计
- [ ] 方案 A：🌊 emoji + "MoodWave" 文字，渐变配色
- [ ] 方案 B：画一个简洁的 SVG 波浪 + 音符 logo
- [ ] 方案 C：如果你有更好的创意，发挥！

### 任务 14：侧边栏 emoji → lucide 图标（`frontend/src/components/moodwave-shell.tsx`）

- [ ] 和任务 12 同一套图标，侧边栏 PC 版也要换
- [ ] import from `lucide-react`

### 任务 15：PWA 图标优化（`frontend/public/icons/`）

- [ ] 检查当前 192x192 和 512x512 图标质量
- [ ] 如果是粗制图标，用 AI 生成更精致的版本（保持 🌊 波浪主题 + Neon Moods 配色）

---

## 涉及文件汇总

| 文件 | 任务 |
|------|------|
| `frontend/src/app/page.tsx` | 1 |
| `frontend/src/app/login/page.tsx` | 2, 10 |
| `frontend/src/app/dashboard/page.tsx` | 3 |
| `frontend/src/app/mood/page.tsx` | 4 |
| `frontend/src/app/analytics/page.tsx` | 5 |
| `frontend/src/app/discovery/page.tsx` | 6 |
| `frontend/src/app/music/page.tsx` | 7 |
| `frontend/src/app/profile/page.tsx` | 8, 9 |
| `frontend/src/components/moodwave-shell.tsx` | 11, 12, 14 |
| `frontend/src/components/moodwave-logo.tsx` | 13 |
| `frontend/public/icons/` | 15 |

---

## 注意事项

- **不要改后端代码**，后端由 WorkBuddy 负责
- **toast 组件**：项目已有 shadcn/ui 的 `useToast`，直接用 `const { toast } = useToast()` + `toast({ title: "..." })`
- **Link 组件**：从 `next/link` 导入
- **lucide-react**：项目已有依赖，直接 import
- **auth store**：`import { useAuthStore } from "@/store/auth"`
- 修改后确保 `npm run build` 不报错

---

*此文档由 WorkBuddy 生成，Codex 按优先级执行。完成后通知 WorkBuddy 联调。*
