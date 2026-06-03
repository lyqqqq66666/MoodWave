# MoodWave iOS 页面拆解清单

> 更新时间: 2026-06-04  
> 关联文档: [iOS-App开发方案与高还原设计说明.md](/Users/LYQ/Desktop/大三资料/我的vibe-coding项目/情绪日记+可视化音乐项目/docs/ios-app/iOS-App开发方案与高还原设计说明.md)  
> 目标: 把 iOS 原型图拆成可开发的页面、子页面、组件与阶段顺序，便于 Codex 直接按清单推进前端实现

---

## 1. 页面拆解原则

本清单遵循以下原则：

- 不从零做新产品
- 尽量复用当前 Web 页面能力
- 先拆高频主路径，再拆低频子页面
- 先拆结构，再拆视觉
- 每个页面都要明确：
  - 对应现有页面
  - iOS 改造目标
  - 组件拆分建议
  - 状态与交互
  - 是否影响 Web

---

## 2. 总开发顺序

推荐按以下顺序推进：

1. iOS App 壳层
2. `心迹` 首页
3. 情绪记录页
4. AI 反馈结果页
5. `音愈` 页面
6. `灵伴` 对话页
7. `我的` 页面
8. `解忧` 页面
9. `灵伴` 记忆 / 换装子页
10. 启动页 / 引导页 / 登录页

---

## 3. 壳层层级拆解

### 3.1 iOS App 壳层

对应现有：

- `frontend/src/components/moodwave-shell.tsx`

改造目标：

- 建立 iOS 专属容器，不影响 Web
- 提供 iPhone 安全区
- 提供 iOS 底部 Tab Bar
- 提供统一的奶白渐变背景和雾玻璃层次

建议拆分组件：

- `IOSAppShell`
- `IOSSafeArea`
- `IOSTabBar`
- `IOSPageContainer`
- `IOSNavBlur`

关键状态：

- `isIOSApp`
- `isLoggedIn`
- `isGuest`
- `currentTab`

是否影响 Web：

- 有潜在影响
- 必须通过包装层隔离，不能直接重写原 Web Shell

---

## 4. 一级主页面拆解

### 4.1 `心迹` 首页

对应现有：

- `frontend/src/app/dashboard/page.tsx`

目标：

- 从 Web dashboard 改成 iOS App 首屏
- 一屏完成“看到今天状态 + 进入记录”

建议区块：

1. 顶部问候栏
2. 日期胶囊
3. 陪伴角色 Hero 区
4. 主输入 CTA
5. 快捷操作区
6. 微趋势入口
7. 底部导航

建议拆分组件：

- `HomeGreetingBar`
- `DateCapsule`
- `CompanionHeroCard`
- `QuickMoodEntryCard`
- `HomeQuickActions`
- `MiniTrendEntry`

关键交互：

- 点击主 CTA 进入记录页
- 点击趋势进入二级趋势页
- 快捷入口跳转音愈 / 灵伴 / 历史

状态类型：

- 游客态
- 已登录态
- 有记录 / 无记录

是否影响 Web：

- 高
- 需要 iOS 包装层单独实现布局和间距

### 4.2 情绪记录页

对应现有：

- `frontend/src/app/mood/page.tsx`

目标：

- 改成 iOS 风格分步记录，不再像长表单

建议步骤：

1. 情绪选择
2. 强度滑块
3. 文本 / 语音 / 图片输入
4. 标签与日期
5. 生成 AI 反馈

建议拆分组件：

- `EmotionStepCard`
- `IntensityStepCard`
- `MoodTextComposer`
- `VoiceEntryButton`
- `MediaUploadTray`
- `TagSelectorIOS`
- `BackfillDateChip`
- `StepProgressDots`

关键交互：

- 上一步 / 下一步
- 跳步
- 游客本地保存
- 登录用户保存并分析

状态类型：

- 当前步骤
- 游客态 / 登录态
- 是否有草稿
- 是否正在分析

是否影响 Web：

- 中高
- 应保留 Web 逻辑，但 iOS 重新组织视觉结构

### 4.3 AI 反馈结果页

对应现有：

- 当前可作为记录页的结果区域或单独结果视图

目标：

- 让用户在记录后获得被接住的感觉

建议区块：

1. 情绪总结卡
2. 关键词卡
3. 灵伴回应卡
4. 去音愈按钮
5. 保存记录按钮

建议拆分组件：

- `MoodSummaryCard`
- `EmotionKeywordsCard`
- `CompanionResponseCard`
- `ResultPrimaryActions`

关键交互：

- 去音愈
- 返回首页
- 保存记录

是否影响 Web：

- 中

### 4.4 `音愈` 页面

对应现有：

- `frontend/src/app/music/page.tsx`

目标：

- 从卡片集合改成主视觉沉浸式播放页

建议区块：

1. 当前情绪推荐标题
2. 主播放球 / 可视化区
3. 控制器
4. 推荐歌单
5. 收藏按钮
6. 听后感输入

建议拆分组件：

- `HealingHeroPlayer`
- `SoftWaveVisualizer`
- `PlaybackControlBar`
- `RecommendedPlaylistCard`
- `ReflectionInputCard`

关键交互：

- 播放 / 暂停
- 切歌
- 收藏
- 返回当前记录

是否影响 Web：

- 中

### 4.5 `灵伴` 页面

对应现有：

- `frontend/src/app/companion/page.tsx`

目标：

- 改成聊天优先
- 把记忆、装扮、档案下沉为子页面或菜单

建议区块：

1. 顶部角色栏
2. 记忆提示 pill
3. 对话流
4. 输入栏
5. 右上角菜单

建议拆分组件：

- `CompanionTopBar`
- `MemoryHintPill`
- `CompanionMessageList`
- `CompanionInputBar`
- `CompanionQuickMenu`

关键交互：

- 发消息
- 打开记忆页
- 打开换装页
- 打开关系档案

状态类型：

- 游客短对话
- 登录记忆对话
- 首次进入

是否影响 Web：

- 中高

### 4.6 `我的` 页面

对应现有：

- `frontend/src/app/profile/page.tsx`

目标：

- 用更轻的方式承接身份、同步和设置

建议区块：

1. 身份状态卡
2. 同步状态卡
3. 情绪档案入口
4. 提醒设置
5. 数据导出
6. 小型统计 chips

建议拆分组件：

- `ProfileIdentityCard`
- `SyncStatusCard`
- `EmotionArchiveEntry`
- `ReminderSettingsList`
- `DataToolsSection`
- `MiniStatsChips`

关键交互：

- 登录 / 退出
- 同步本地记录
- 编辑资料

状态类型：

- 游客态
- 已登录态
- 有本地记录待同步

是否影响 Web：

- 中

### 4.7 `解忧` 页面

对应现有：

- `frontend/src/app/discovery/page.tsx`

目标：

- 从 Web 卡片流调整为更轻的匿名共鸣空间

建议区块：

1. 匿名倾诉入口
2. 标签筛选 chips
3. 共鸣卡片流
4. 轻互动条
5. 浮动发帖按钮

建议拆分组件：

- `SafePostEntryCard`
- `ResonanceFilterChips`
- `ConfessionFeedCard`
- `SoftReactionBar`
- `FloatingPostButton`

关键交互：

- 浏览
- 发帖
- 共鸣
- 评论

状态类型：

- 游客只读
- 登录互动

是否影响 Web：

- 中

---

## 5. 二级子页面拆解

### 5.1 `灵伴` 记忆页

目标：

- 展示灵伴记住的内容，而不是聊天附属抽屉

建议区块：

1. 角色头像卡
2. 记忆时间线
3. 人格 / 兴趣标签
4. 关系摘要

建议拆分组件：

- `CompanionProfileCard`
- `MemoryTimeline`
- `PersonalityTags`
- `RelationshipSummaryCard`

### 5.2 `灵伴` 换装页

目标：

- 提供情绪皮肤、角色主题、简单装扮选择

建议区块：

1. 当前形象预览
2. 主题皮肤选择
3. 色系选择
4. 应用按钮

建议拆分组件：

- `CompanionSkinPreview`
- `OutfitOptionGrid`
- `ThemeColorPicker`

### 5.3 趋势页

对应现有：

- `frontend/src/app/analytics/page.tsx`

目标：

- 从一级导航移出，作为二级数据页

建议区块：

1. 7 天 / 30 天切换
2. 趋势图
3. 情绪分布
4. 关键词与 AI 洞察

建议拆分组件：

- `TrendRangeTabs`
- `MoodTrendCard`
- `MoodDistributionCard`
- `InsightSummaryCard`

### 5.4 登录页

对应现有：

- `frontend/src/app/login/page.tsx`

目标：

- 更像 App 内登录页，而不是 Web 落地登录页

建议区块：

1. 顶部返回
2. 品牌轻说明
3. 微信登录主按钮
4. 游客说明
5. 同步说明

### 5.5 Onboarding / 引导页

目标：

- 只用 2-3 屏传达价值

建议页面：

1. 轻记录
2. 灵伴陪伴
3. 游客先用，登录同步

### 5.6 Splash / 品牌过渡页

目标：

- 建立 iOS App 第一印象

建议区块：

1. 品牌图标
2. 口号
3. 柔和粒子 / 呼吸动效

---

## 6. 页面与现有代码映射

### 6.1 页面映射表

| iOS 页面 | 现有代码 | 改造方式 |
|------|------|------|
| 心迹首页 | `frontend/src/app/dashboard/page.tsx` | 重构布局，保留核心数据流 |
| 记录页 | `frontend/src/app/mood/page.tsx` | 改成长表单为分步卡片 |
| 音愈页 | `frontend/src/app/music/page.tsx` | 改成沉浸式播放器布局 |
| 灵伴页 | `frontend/src/app/companion/page.tsx` | 改成聊天优先 |
| 解忧页 | `frontend/src/app/discovery/page.tsx` | 改成软性社区流 |
| 我的页 | `frontend/src/app/profile/page.tsx` | 重排身份与同步结构 |
| 趋势页 | `frontend/src/app/analytics/page.tsx` | 从一级页面改为二级入口 |

---

## 7. 组件优先级

### 7.1 P0 先做

- `IOSAppShell`
- `IOSTabBar`
- `IOSGlassCard`
- `MoodCapsuleButton`
- `CompanionHeroCard`
- `QuickMoodEntryCard`
- `EmotionStepCard`
- `CompanionInputBar`

### 7.2 P1 再做

- `SoftWaveVisualizer`
- `ConfessionFeedCard`
- `MemoryTimeline`
- `SyncStatusCard`
- `InsightSummaryCard`

### 7.3 P2 补细节

- `ThemeColorPicker`
- `OutfitOptionGrid`
- `MiniStatsChips`
- `FloatingPostButton`

---

## 8. 每个阶段结束时的交付物

### 阶段 A 结束

- iOS 壳层可运行
- Web 未被误伤
- 底部导航与页面容器成型

### 阶段 B 结束

- 首页、记录页、结果页可演示
- 主记录闭环跑通

### 阶段 C 结束

- 灵伴页、我的页完成
- 游客态 / 登录态差异清晰

### 阶段 D 结束

- 解忧页、记忆页、引导页完成
- iOS 演示链路完整

---

## 9. Codex 开发时的执行方式

Codex 在实际开发时应按以下节奏推进：

1. 先从本清单中选择一个页面
2. 先拆它的组件与状态
3. 先做 iOS 包装层，不直接污染 Web
4. 完成页面后跑检查
5. 做一次视觉对照
6. 做一次结构审查
7. 再进入下一个页面

---

## 10. 最终说明

这份页面拆解清单的价值，不是把设计变成静态目录，而是把原型图变成可以直接开发的路线图。

后续真正开始改代码时，Codex 可以直接以这份文档为页面施工顺序和组件拆解依据。
