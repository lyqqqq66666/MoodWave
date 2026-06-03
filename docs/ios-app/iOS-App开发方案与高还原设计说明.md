# MoodWave iOS App 开发方案与高还原设计说明

> 更新时间: 2026-06-04  
> 适用范围: MoodWave 灵音 iOS 前端优先开发阶段  
> 关联主文档: [PRD-v3-Android-App化视觉重构.md](/Users/LYQ/Desktop/大三资料/我的vibe-coding项目/情绪日记+可视化音乐项目/docs/PRD-v3-Android-App化视觉重构.md)  
> 当前原则: 先做 iOS，不重开项目，不推倒重写，复用既有 Web 前端资产；后端与数据库由 WorkBuddy 负责；Codex 负责前端实现、架构把关、阶段性代码审查与测试策略

---

## 1. 这份文档解决什么问题

这份文档用于统一以下事项：

- iOS App 要如何基于现有 Web 项目改造，而不是从零重写
- 之前生成的 3 张 iOS 原型图用了什么提示词、设计逻辑是什么
- 如何把这些设计高还原落到前端实现
- iOS 开发过程中如何避免影响当前 Web 和后续 Android
- Codex 与 WorkBuddy 如何分工
- 每一阶段结束后如何通过 hook、测试、代码审查、架构检查来控风险

---

## 2. 总体开发边界

### 2.1 核心原则

本阶段只做 iOS App 前端落地，目标是：

- 在现有 `frontend` 基础上完成 iOS App 化改造
- 不新开一套全新前端项目
- 不先动后端和数据库主逻辑
- 不直接破坏现有 Web 展示形态
- 不提前重做 Android，Android 后续参考 iOS 成熟方案再跟进

### 2.2 明确分工

#### Codex 负责

- iOS 前端页面改造与组件实现
- iOS App 壳层、导航、交互、视觉还原
- 前端架构设计与改造边界把控
- 阶段性 code review
- 测试清单、回归清单、hook 方案设计
- 每阶段结束后的结构风险检查

#### WorkBuddy 负责

- 后端 API 调整
- 认证策略后端配合
- 数据库与模型字段调整
- 文件上传与服务端能力
- iOS 前端联调所需的后端支撑

### 2.3 本阶段不做

- 不重写为 SwiftUI 原生界面
- 不重写为 React Native / Flutter
- 不先做 Android 视觉重构
- 不把 Web 首页整体改成 iOS App 首页
- 不在没有验证的情况下大改共享路由和共享组件

---

## 3. 与主 PRD 的关系

本方案直接继承主 PRD 中的以下结论：

- 产品进入 iOS 优先的双端 App 化重构阶段
- 保留 Web 展示与开发能力
- 使用现有前端资产与 Capacitor 路线
- 视觉方向为 `Soft Liquid Healing / 治愈雾玻璃`
- 用户主流程为 `心迹 -> 记录 -> 灵伴 -> 音愈 -> 解忧 -> 我的`

本方案是在主 PRD 的基础上进一步把 iOS 开发落成“怎么做”的执行文档。

---

## 4. 原型图资产与生成信息

### 4.1 当前 3 张 iOS 原型图

#### 原型图 1：入口流程 / 首次印象

文件路径：

- `/Users/LYQ/.codex/generated_images/019e8cbb-4b1c-73c0-8f74-462b5ebc5c17/ig_098974aeba006f8b016a204bbadb6481919a44d288b7caf92d.png`

设计内容：

- Splash 启动页
- Onboarding 引导页
- 登录 / 游客模式页
- `心迹` 首页

#### 原型图 2：记录 + 音愈主流程

文件路径：

- `/Users/LYQ/.codex/generated_images/019e8cbb-4b1c-73c0-8f74-462b5ebc5c17/ig_098974aeba006f8b016a204c5fcb18819181f4354d57a2fd42.png`

设计内容：

- 记录页 Step 1-2
- 记录页 Step 3-4
- AI 反馈结果页
- `音愈` 页面

#### 原型图 3：灵伴 + 解忧 + 我的

文件路径：

- `/Users/LYQ/.codex/generated_images/019e8cbb-4b1c-73c0-8f74-462b5ebc5c17/ig_098974aeba006f8b016a204cc1d3b48191be2c64030213e897.png`

设计内容：

- `灵伴` 对话页
- `灵伴` 记忆 / 换装子页
- `解忧` 匿名社区页
- `我的` 个人中心页

### 4.2 这 3 张图使用的提示词

以下为生成时使用的原始提示词整理版，可作为后续继续出图的基线。

#### Prompt 1：入口流程 / First Impression

```text
Create a polished mobile app UI storyboard sheet for an iOS emotional wellness app called 'MoodWave 灵音'. This is a high-fidelity product design board, not code, not wireframe. Style must follow a cute healing design system: warm cream background (#FFF8F0), translucent white cards, sakura pink (#FFB5C2), mint green (#A8E6CF), soft yellow (#FFD93D), lavender (#CBC3E3), rounded 32px cards, capsule buttons, soft shadows, glassmorphism, gentle gradients, friendly rounded Chinese UI typography, iOS native spacing and safe areas. Avoid dark cyberpunk, avoid neon glow, avoid sharp corners.

Sheet 1 theme: 'Entry Flow / First Impression'. Show 4 vertically oriented iPhone mockups arranged beautifully on one canvas with small labels under each screen in Chinese.

Screen A: Splash screen. Minimal cream gradient background, floating MoodWave icon, tiny sparkles, slogan text in Chinese: '记录情绪的潮汐，遇见内心的风景'.
Screen B: Onboarding page 1. Cute mascot orb/companion, headline about writing down emotions lightly, soft illustration, progress dots.
Screen C: Login / guest mode page. Asymmetric glass card layout, WeChat login button, guest mode secondary button, soft wave background.
Screen D: Home page '心迹'. iOS app home with top greeting, date chip, central cute companion illustration, large input CTA '写下此刻的情绪', two rounded quick actions, tiny trend shortcut, bottom tab bar with 5 items: 心迹, 灵伴, 音愈, 解忧, 我的.

Make it feel like a real modern iOS app design presentation from a top product designer. Add subtle shadows, layered glass cards, pastel gradients, delightful micro-illustrations, consistent MoodWave branding.
```

#### Prompt 2：记录 + 音愈主流程

```text
Create Sheet 2 of a high-fidelity iOS app storyboard for MoodWave 灵音, a cute healing emotional wellness app. Use the same established visual language: warm cream backgrounds, pastel sakura pink, mint, lavender, buttery yellow, translucent white glass cards, soft layered gradients, adorable orb mascot, rounded Chinese typography, big rounded corners, iOS native look, no dark mode, no neon. This is a premium UI design board with 4 iPhone screens on one canvas, labeled in Chinese.

Theme: 'Core Use Flow / Record + Heal'.

Screen A: Mood recording step 1-2. Select emotion with six cute rounded emotion chips and a soft intensity slider. Big title, playful but calm.
Screen B: Mood recording step 3-4. Text input card, voice button, image upload placeholders, tag chips, date picker chip for backfill. Glassy cards and capsule actions.
Screen C: AI feedback result page. A gentle analysis card with key phrases, emotion summary, encouraging companion response, CTA buttons '去音愈' and '保存记录'.
Screen D: Music healing page '音愈'. Large central album orb visualization, playback controls, emotional playlist cards, breathing ripple background, favorite button, short reflection input.

The overall canvas should feel like an Apple-style app presentation adapted to MoodWave's pastel healing brand. Show subtle depth, blurred layers, floating particles, and coherent spacing.
```

#### Prompt 3：灵伴 + 解忧 + 我的

```text
Create Sheet 3 of a premium high-fidelity iOS UI storyboard for MoodWave 灵音. Keep exact same MoodWave design language: cute healing pastel aesthetics, warm cream base, sakura pink, mint, lavender, butter yellow, frosted glass cards, very rounded corners, adorable orb companion mascot, soft shadows, rounded Chinese typography, iOS-native spacing. No neon, no dark cyberpunk, no harsh contrast.

Theme: 'Companion + Community + Profile'. Show 4 iPhone mockups on one elegant design board with Chinese labels.

Screen A: Companion chat page '灵伴'. Chat-first layout with cute AI orb avatar, soft message bubbles, memory hint pill, top right menu for memory / outfit / archive, bottom warm text input.
Screen B: Companion memory / outfit subpage. Card-based profile for the AI companion, saved memories timeline, personality tags, outfit cards or mood skins.
Screen C: Anonymous community page '解忧'. Safe soft feed of rounded confession cards, category filter chips, floating post button, empathetic light interactions like '抱抱', '共鸣', comments.
Screen D: Profile page '我的'. Guest/login state card, sync status, emotional archive shortcut, reminder settings, export data, cute stats chips, soft list items.

Make it feel like a cohesive Apple keynote-style product mockup sheet for a polished startup app. Highly aesthetic, emotionally warm, practical, and consistent with the earlier two sheets.
```

---

## 5. 这些设计为什么能符合 MoodWave 风格

### 5.1 设计依据

原型图不是随意出的，而是严格基于项目已有设计规范：

- `moodwave-design` 技能中的可爱治愈风
- `moodwave-cutie-style` 技能中的组件规范
- 主 PRD 中的 `Soft Liquid Healing / 治愈雾玻璃`

### 5.2 核心视觉要素

#### 配色

- 主底色：`#FFF8F0`
- 品牌粉：`#FFB5C2`
- 品牌绿：`#A8E6CF`
- 品牌黄：`#FFD93D`
- 品牌紫：`#CBC3E3`

#### 组件气质

- 32px 大圆角卡片
- 胶囊按钮
- 半透明白色雾玻璃卡片
- 低对比、柔和投影
- 不使用赛博霓虹和高饱和发光

#### 页面气质

- 一屏一主任务
- 顶部信息简洁
- 主 CTA 明确
- 角色感与陪伴感强
- 不是 dashboard 堆叠，而是 App 场景式布局

---

## 6. 如何让前端高度还原这些效果

### 6.1 可以高度还原的部分

以下内容可以通过现有前端技术栈高还原实现：

- 页面结构与布局层级
- 渐变背景
- 玻璃感卡片
- 大圆角、胶囊按钮
- Tab Bar 结构
- 输入框、标签 chips、统计卡、对话气泡
- 柔和阴影
- 呼吸感、淡入、轻上浮动效
- 情绪选择、强度滑块、AI 反馈卡片

### 6.2 需要“近似实现”而不是逐像素复刻的部分

- AI 图中非常细碎的微插画形状
- 某些不规则高光与半透明边缘
- 粒子漂浮和液态感的随机纹理
- 音乐可视化里的抽象光晕和波纹

这些内容不应追求像素级复刻，而应追求：

- 同一视觉语言
- 同一氛围
- 同一交互重心
- 同一层级节奏

### 6.3 高还原的实现方法

#### 样式层

- 统一抽出 iOS App 主题变量，不直接污染 Web 全局主题
- 使用 CSS 变量管理背景、文字、边框、模糊、阴影、圆角
- 把雾玻璃卡片、胶囊按钮、情绪标签做成可复用组件

#### 布局层

- 采用 iPhone 安全区优先布局
- 控制每屏内容密度，避免 Web 的长滚动
- 固定底部导航高度与底部留白
- 首页、记录页、灵伴页优先一屏表达主任务

#### 动效层

- 页面切换用 Framer Motion
- 卡片出现使用 `opacity + translateY`
- 角色呼吸动效用 `scale` 小幅循环
- 音愈页面的波纹与光晕可用 CSS + Canvas 近似

#### 组件层

- 先抽公共视觉组件，再拼页面
- 组件命名要面向 App 场景，而不是面向 Web 杂项
- 组件示例：
  - `IOSGlassCard`
  - `MoodCapsuleButton`
  - `CompanionHeroCard`
  - `EmotionChipGroup`
  - `BottomTabBarIOS`
  - `SoftSheet`

### 6.4 高还原不是直接看图硬写

正确流程应为：

1. 先把原型图拆成页面结构
2. 再把结构拆成组件
3. 再定义颜色、间距、圆角、阴影、动效规范
4. 再实现第一版页面
5. 最后对照原型图做 1-2 轮视觉校正

---

## 7. iOS 开发总路线

### 7.1 总目标

在现有 `frontend` 项目里，基于 Next.js + Capacitor 路线完成 iOS App 前端优先开发，形成一个可运行、可演示、风格统一、尽量不影响 Web 的 iOS 版本。

### 7.2 开发原则

- 不从零开始
- 先复用已有页面和数据流
- 优先改 App 壳层、视觉和交互
- 尽量不动 Web 落地页
- 平台差异通过 iOS 专属判断与样式隔离处理

### 7.3 只做 iOS，如何避免影响 Web 和 Android

#### 规则一：不直接重写现有 Web 首页

- `frontend/src/app/page.tsx` 保持 Web 展示定位
- iOS App 首页优先从登录后主流程页衍生，例如 `/dashboard`

#### 规则二：iOS 样式必须有运行环境隔离

- 通过平台判断只在 iOS App 内启用 iOS 壳层样式
- 不把 iOS 安全区、iOS 专属导航、iOS 专属间距直接写死到 Web 通用布局

#### 规则三：共用组件先包一层，不直接全局替换

- 对现有组件做 iOS 包装层
- 等 iOS 版本稳定后，再决定是否回流为通用组件

#### 规则四：Android 暂不跟改

- 不为了 Android 兼容提前牺牲 iOS 设计完成度
- Android 后续以成熟 iOS 方案为参考再适配

---

## 8. 现有代码基础上的 iOS 实施方案

### 8.1 现有资产直接复用

可直接复用的部分：

- Next.js 页面路由结构
- Zustand 状态管理
- 登录态与游客态雏形
- 情绪记录、AI、音乐、社区、个人中心页面
- Tailwind + Shadcn/UI 组件底座

### 8.2 优先改造的页面顺序

建议按以下顺序做：

1. iOS App 壳层
2. `心迹` 首页
3. 情绪记录页
4. AI 反馈结果页
5. `音愈` 页面
6. `灵伴` 主对话页
7. `我的` 页面
8. `解忧` 页面
9. `灵伴` 记忆 / 换装子页
10. 启动页 / 引导页 / 登录页

### 8.3 每个阶段怎么做

#### 阶段 A：壳层与平台隔离

目标：

- 建立 iOS App 独立壳层
- 不影响 Web

内容：

- iOS 运行环境判断
- iOS 安全区容器
- iOS 底部 Tab Bar
- iOS 页面背景系统
- iOS App 全局主题变量

#### 阶段 B：首页与记录主流程

目标：

- 先把主路径做成像 App

内容：

- `心迹` 首页改成 App 首屏
- 记录流程改成分步卡片
- AI 结果页与音愈跳转打通

#### 阶段 C：陪伴与个人中心

目标：

- 完成高频与差异化模块

内容：

- `灵伴` 对话页重构
- `我的` 游客 / 登录状态重构
- 本地同步提示与入口整理

#### 阶段 D：社区与子页补齐

目标：

- 完成完整演示链路

内容：

- `解忧` 页重构
- `灵伴` 记忆 / 换装页
- 登录页和引导页细化

---

## 9. 推荐的目录与文档管理方式

### 9.1 文档目录

本次新建目录：

- `docs/ios-app/`

建议后续继续在这个目录下积累：

- `iOS-App开发方案与高还原设计说明.md`
- `iOS-页面拆解清单.md`
- `iOS-测试与回归清单.md`
- `iOS-WorkBuddy联调需求清单.md`

### 9.2 代码目录建议

前端代码暂不新开项目，建议逐步增加：

- `frontend/src/components/ios/`
- `frontend/src/lib/ios/`
- `frontend/src/styles/ios-theme.css`

用于隔离 iOS 组件、平台工具和主题。

---

## 10. Git 分支与协作方式

### 10.1 当前推荐分支

- `main`
- `codex/web-current`
- `codex/app-shell-unified`
- `codex/ios-capacitor`
- `codex/android-capacitor`

### 10.2 本阶段实际执行建议

因为你现在明确要求“只做 iOS，不影响 Web 和 Android”，本阶段应优先：

- 所有 iOS 专属改动放在 `codex/ios-capacitor`
- 只有确认完全不会影响 Web 的共享包装层，才允许同步到 `codex/app-shell-unified`

### 10.3 Git 使用规则

- 每完成一个稳定页面，提交一次
- 每完成一个可演示阶段，提交一次
- 每完成一个开发阶段后，必须同步到 `codex/ios-capacitor` 分支
- 每次准备大改之前，先提交当前稳定点
- 未经验证，不合并回 `main`

### 10.4 阶段完成后的同步要求

本阶段的默认执行规则是：

1. 完成一个阶段开发
2. 完成本阶段检查
3. 完成本阶段 Codex 审查
4. 将当前稳定结果提交并同步到 `codex/ios-capacitor`

这里的“阶段”至少包括：

- 阶段 A：壳层与平台隔离
- 阶段 B：首页与记录主流程
- 阶段 C：陪伴与个人中心
- 阶段 D：社区与子页补齐

也就是说，本项目 iOS 开发不是等全部做完再统一提交，而是**每完成一个阶段，就同步一次 iOS 分支**，确保：

- 有稳定回退点
- 有清晰的里程碑记录
- WorkBuddy 后续联调时能基于明确版本协作

---

## 11. Hook、测试、代码审查与架构检查

### 11.1 目标

你要求“每修改一个阶段以后就要有 hook 做代码审查、测试”，这里建议采用“自动检查 + Codex 审查”的双保险方式。

### 11.2 建议的 hook 体系

#### pre-commit

用于快速阻止明显问题进入提交：

- TypeScript 类型检查
- ESLint 检查
- 关键目录格式检查

建议检查范围：

- `frontend/src/components/ios/`
- `frontend/src/app/`
- `frontend/src/lib/`

#### pre-push

用于阻止高风险改动直接推送：

- `npm run type-check`
- `npm run lint`
- iOS 相关页面 smoke checklist

### 11.3 每阶段结束后的固定审查动作

每完成一个阶段后，必须执行：

1. Codex 做一次代码审查
2. Codex 做一次架构边界检查
3. 前端执行类型检查与 lint
4. 人工对照原型图做视觉回归
5. 确认 Web 关键页面未被误伤

### 11.4 Codex 的架构审查重点

- iOS 专属样式是否污染 Web
- 是否把平台差异硬编码到共享组件
- 页面是否越改越像 App，而不是继续像 Web dashboard
- 组件抽象是否合理
- 是否过早改动 Android 共用层
- 是否出现难以维护的大型页面

### 11.5 WorkBuddy 联调前检查

在把需求发给 WorkBuddy 前，Codex 先给出：

- 前端需要的接口清单
- 字段变更清单
- 游客态 / 登录态的数据分流清单
- 对后端无侵入、轻侵入、必须改动的分级说明

---

## 12. 测试方案

### 12.1 本阶段测试重点

因为当前优先做前端，测试重点不是数据库正确性，而是：

- 页面是否能跑
- 平台样式是否正确
- 交互是否流畅
- 游客态与登录态是否分明
- Web 是否没有被误伤

### 12.2 测试层次

#### 层次一：静态检查

- TypeScript
- ESLint
- import 边界检查

#### 层次二：页面功能回归

- 首页
- 记录页
- 灵伴页
- 音愈页
- 我的页

#### 层次三：平台隔离验证

- Web 下页面是否保持原逻辑
- iOS 容器下是否启用专属样式
- Android 代码路径是否未被误改

#### 层次四：视觉回归

- 对照原型图检查层级、间距、圆角、卡片、主 CTA、动效气质

### 12.3 每个阶段最少要过的检查

- `type-check`
- `lint`
- 1 次视觉回归
- 1 次 Web 未误伤检查
- 1 次 Codex 审查结论

---

## 13. 维护方案

### 13.1 为什么现在就要写维护

虽然现在是开发期，但维护规则必须提前写好，否则后面会出现：

- iOS 改动误伤 Web
- 视觉风格漂移
- 页面实现不统一
- WorkBuddy 联调时接口边界反复变化

### 13.2 当前阶段的维护重点

- 保持 iOS 风格统一
- 保持 iOS 代码路径与 Web 代码路径边界清晰
- 保持页面结构可拆分、可复用
- 保持每阶段结束后都有回归

### 13.3 维护不是另开项目

维护方式不是重新做一套维护系统，而是：

- 在现有仓库里建立规范
- 用 hook 控提交质量
- 用 Codex 做阶段性 review
- 用文档记录每个阶段的完成与风险

---

## 14. 面向前端实现的页面拆解原则

### 14.1 首页 `心迹`

拆成：

- 顶部问候栏
- 日期胶囊
- 陪伴角色 Hero 区
- 主输入 CTA
- 快捷入口卡
- 微型趋势入口
- 底部 Tab Bar

### 14.2 记录页

拆成：

- 情绪选择卡
- 强度滑块卡
- 文本表达卡
- 语音按钮
- 图片上传卡
- 标签选择区
- 补记日期胶囊
- 结果页 CTA

### 14.3 灵伴页

拆成：

- 顶部角色信息
- 对话流
- 记忆提示条
- 输入栏
- 二级菜单入口

### 14.4 音愈页

拆成：

- 主视觉播放球
- 情绪推荐标题
- 播放控制器
- 推荐歌单卡
- 听后感输入

### 14.5 我的页

拆成：

- 身份状态卡
- 同步状态卡
- 情绪档案入口
- 提醒设置项
- 数据导出项
- 小型统计 chips

---

## 15. 第一阶段实际开工建议

如果现在立刻开始做，最推荐的顺序是：

1. 建立 `docs/ios-app/` 文档体系
2. 在 `codex/ios-capacitor` 上开始 iOS 样式隔离
3. 抽 `ios-theme` 变量与 `ios` 组件目录
4. 先改 `moodwave-shell` 的 iOS 包装层
5. 先落 `心迹` 首页
6. 再落记录页与结果页
7. 每完成一个阶段，触发一次检查与审查

---

## 16. 最后如何在 Xcode 里打开、运行、预览

### 16.1 当前项目现状

你当前项目里：

- 已经有 `frontend/capacitor.config.ts`
- 已经有 Android Capacitor 依赖
- 还没有 iOS 工程目录
- `frontend/package.json` 里目前还没有 `@capacitor/ios`

所以要在 Xcode 里打开预览，首先要先把 iOS 平台接进来。

### 16.2 推荐的实际步骤

以下步骤以 `frontend/` 为工作目录。

#### 第一步：安装 iOS 平台依赖

```bash
npm install @capacitor/ios
```

#### 第二步：创建 iOS 工程

```bash
npx cap add ios
```

执行后，理论上会生成：

- `frontend/ios/`

#### 第三步：准备前端构建产物

如果沿用你现在的静态导出模式：

```bash
npm run build:export
```

这一步会生成：

- `frontend/out/`

因为当前 `frontend/capacitor.config.ts` 里的 `webDir` 是 `out`，所以 Capacitor 会把这个目录作为 Web 资源来源。

#### 第四步：同步到 iOS 工程

```bash
npx cap sync ios
```

如果你只更新了前端页面，也可以反复执行这一步，把最新前端资源同步到 iOS 工程。

#### 第五步：用 Xcode 打开工程

```bash
npx cap open ios
```

这条命令会尝试直接打开 Xcode 工程。

如果不想用命令打开，也可以手动在 Finder 或 Xcode 中打开：

- `frontend/ios/App/App.xcworkspace`

优先打开 `.xcworkspace`，不要只开 `.xcodeproj`。

### 16.3 在 Xcode 里怎么运行预览

打开后按下面顺序操作：

1. 左上角选择 Scheme，通常是 `App`
2. 选择一个模拟器设备
   - 推荐：`iPhone 15`
   - 或 `iPhone 15 Pro`
3. 点击左上角运行按钮
   - 或直接按 `Cmd + R`
4. 等待模拟器启动并安装 App

首次运行如果弹出签名或权限提示，先按默认本地调试方式处理即可。

### 16.4 前端改了以后，怎么再次预览

日常迭代时建议循环如下：

```bash
npm run build:export
npx cap sync ios
npx cap open ios
```

更常见的工作方式是：

1. 改前端页面
2. 重新执行 `npm run build:export`
3. 再执行 `npx cap sync ios`
4. 回到 Xcode
5. 按 `Cmd + R` 重新运行

### 16.5 本项目里特别需要注意的点

#### 注意一：当前项目还没装 `@capacitor/ios`

所以如果现在立刻执行 `npx cap add ios`，大概率会先提示缺少 iOS 平台依赖，需要先安装。

#### 注意二：当前配置依赖 `out`

也就是说：

- 如果没有先执行 `npm run build:export`
- `frontend/out/` 不完整或不是最新

那么 Xcode 里看到的页面就不会是最新的前端效果。

#### 注意三：Web 与 iOS 是同一套前端产物

因此你在 iOS 上看到的内容，本质还是当前前端导出的页面，只是被装进了 iOS 容器。

所以 iOS 预览是否像 App，关键不是 Xcode 本身，而是：

- 前端壳层有没有 iOS 化
- 页面结构有没有重做
- 平台隔离是否正确

### 16.6 建议你最后在 Xcode 里重点检查什么

首次跑起来后，优先检查：

- 启动页是否正常
- 安全区是否正确
- 底部 Tab Bar 是否被遮挡
- 首页是否像 App 而不是 Web 页面
- 记录页是否有长滚动问题
- 输入框、键盘、弹层是否顶坏布局
- 音愈页动画与播放控件是否稳定

### 16.7 后续如果要真机预览

后续如果需要真机预览，再补做：

- Apple 开发者账号签名配置
- Bundle Identifier 调整
- 真机权限说明文案

但在当前阶段，先用模拟器跑通就足够了。

---

## 17. 最终结论

MoodWave 的 iOS 开发不应该从零开始，也不应该先追求完全原生重写。

正确路线是：

- 以现有 Web 前端为基础
- 用 iOS App 化设计重做主流程体验
- 通过平台隔离避免误伤 Web 与 Android
- 由 Codex 优先推进前端、架构、审查与测试机制
- 由 WorkBuddy 补足后端与数据库支撑

这样才能在开发效率、视觉完成度、项目可控性之间取得最好的平衡。
