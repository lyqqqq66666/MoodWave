# 🎨 MoodWave "情绪极光 (Emotional Aurora)" UI 设计手册

本方案旨在将 MoodWave 现有的简易界面升级为具备 **"高端感、惊艳感、沉浸感"** 的现代化 Web 应用。

---

## 🌌 1. 设计核心理念 (Core Concept)

- **视觉关键词**：深邃 (Depth)、流光 (Luminescence)、有机 (Organic)、高级感 (Prestige)。
- **设计风格**：**Cyber-Healing (赛博治愈)**。结合了赛博朋克的霓虹发光与治愈系的柔和呼吸感。
- **核心材质**：**Glassmorphism 2.0 (极深玻璃态)**。通过多层模糊、细腻的白色/彩色描边（1px）和噪点纹理增加质感。

---

## 🎨 2. 视觉规范 (Visual Specs)

### A. 背景与层次
- **底色 (Base)**: `#050505` (非纯黑，带有一点深灰的质感)。
- **容器色 (Surface)**: `rgba(25, 25, 25, 0.6)` 配合 `backdrop-blur(24px)`。
- **背景光源**: 3-4个颜色各异的动态模糊圆点（Mesh Gradient），在角落缓慢游走。

### B. 字体系统
- **标题**: `Outfit` 或 `Montserrat` (极粗/极细交替使用，营造对比度)。
- **正文**: `Sora` (高可读性，现代感)。
- **中文建议**: `PingFang SC` 或 `Noto Sans SC` (Light/Regular/Bold)。

### C. 情绪色彩升级 (Neon Moods)
每种情绪不再是单纯的颜色，而是带有发光效果的渐变：
- **Happy**: `#FFD93D` -> `#FF9800` (金橙渐变)
- **Calm**: `#9D84B7` -> `#6366F1` (丁香紫渐变)
- **Anxious**: `#4D96FF` -> `#06B6D4` (极光蓝渐变)
- **Angry**: `#FF6B6B` -> `#DC2626` (熔岩红渐变)
- **Sad**: `#6BCB77` -> `#10B981` (翡翠绿渐变)
- **Neutral**: `#A8DADC` -> `#94A3B8` (岩灰渐变)

---

## 📂 3. 页面布局与架构 (Architecture)

### 第 1 页：欢迎/登录页 (Landing & Login)
- **设计重点**：视觉震撼。
- **布局**：
    - 中间是发光的 **MoodWave Logo**，带呼吸动画。
    - 背景是全屏的流体渐变。
    - 垂直居中的简洁登录卡片，玻璃磨砂质感。
    - 底部的文字提示：“听见你的心情，看见你的旋律”。

### 第 2 页：主协作中心 (Workspace / Dashboard)
- **导航系统**：
    - **侧边导航栏 (Sidebar)**：固定在左侧，窄设计，高对比度图标。
    - **顶部状态栏 (Topbar)**：显示当前日期、用户信息及全局搜索。
- **主体内容区**：
    - 分为多个模块化的 **Wigdet 组件**（卡片式）。
    - 左右分栏布局，左侧为情绪日历统计，右侧为快捷入口。

### 第 3-5 页：功能拆分
1. **情绪录入页**：沉浸式单向流体验。逐个问题出现（今天感觉如何？强度是多少？），每次点击伴随背景色过渡演变。
2. **分析中心**：利用 `Bento Grid` (瀑布流卡片) 布局展示折线图、云图和饼图。
3. **音乐视听室**：全屏黑色背景，中心显示 CD 轮播或波形图。两侧悬浮极简的操作按钮。

---

## 🪄 4. Stitch / v0 生成提示词 (Prompts)

### 欢迎/登录页提示词
> **Prompt**: Create a high-end, premium landing page for a mood-tracking app called "MoodWave". Black background with deep mesh gradients (purple, blue, amber). Center a glassmorphism login card with ultra-thin white borders and soft inner glow. Typography: "Outfit" sans-serif. Use organic fluid shapes floating in background. Futuristic, elegant, serene vibe. Dark mode only.

### 内部仪表盘与导航提示词
> **Prompt**: Design a modern workspace dashboard with a sleek vertical sidebar. Use a dark theme (#050505). Cards should have a "Glassmorphism" effect with 20px backdrop blur and 1px borders. Navbar icons should have a subtle neon hover glow. Content area: Bento layout for statistics including a line trend chart and a mood distribution pie chart. Tech stack: Next.js, Tailwind, Lucide icons. High-fidelity UI.

### 情绪录入页提示词
> **Prompt**: An immersive, multi-step form for mood journaling. Large emoji selectors with hover scale effects. A custom range slider for mood intensity that changes color from cold blue to warm orange as it increases. Deep black background with a centered, glowing card. Step-by-step transition animation. "Organic Healing" aesthetic.

---

## 🎬 5. 交互与动效 (Interactions)

- **页面切换**: 使用 `Framer Motion` 的 `LayoutId` 实现卡片平滑展开。
- **微动效**: 按钮悬停时产生极细小的内发光。
- **加载态**: 渐进式的流体线条加载动画。
