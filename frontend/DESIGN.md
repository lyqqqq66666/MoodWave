# 🎨 MoodWave 前端设计系统

## 设计理念

MoodWave 采用**"有机治愈 × 现代极简"**的设计美学，创造一个独特而富有情感的用户体验。

### 核心设计原则

1. **情绪驱动的视觉语言** - 每种情绪都有独特的颜色、动画和视觉效果
2. **流动的有机形态** - 使用柔和的曲线、渐变和动态效果
3. **沉浸式交互** - 精心设计的动画和微交互增强用户参与感
4. **治愈系配色** - 柔和而富有活力的色彩系统
5. **响应式设计** - 完美适配各种设备

---

## 🎨 设计系统

### 1. 色彩系统

#### 情绪色彩（6种情绪）
```css
happy (开心)   - #FFD93D (温暖的黄色)
sad (伤心)     - #6BCB77 (柔和的绿色)
angry (愤怒)   - #FF6B6B (活力的红色)
anxious (焦虑) - #4D96FF (平静的蓝色)
calm (平静)    - #9D84B7 (优雅的紫色)
neutral (中性) - #A8DADC (清新的青色)
```

每种情绪色都有 light、dark、glow 三个变体，用于不同的视觉层次。

#### 品牌色
```css
primary   - #8B5CF6 (紫色)
secondary - #EC4899 (粉色)
accent    - #F59E0B (橙色)
```

#### 背景色系统
- 支持深色/浅色模式
- 使用 CSS 变量实现主题切换
- 多层次的背景色（surface, elevated）

### 2. 字体系统

#### 字体选择（避免通用字体）
```css
display: 'Outfit' - 用于标题和大字
body: 'Sora' - 用于正文
mono: 'JetBrains Mono' - 用于代码
```

#### 字体大小
- `display-xl`: 4.5rem - 超大标题
- `display-lg`: 3.5rem - 大标题
- `display-md`: 2.5rem - 中标题

### 3. 动画系统

#### 内置动画
```css
float       - 浮动效果（6s循环）
pulse-slow  - 慢速脉冲（4s循环）
shimmer     - 闪烁效果（2s循环）
glow        - 发光效果（2s循环）
slide-up    - 向上滑入（0.5s）
slide-down  - 向下滑入（0.5s）
fade-in     - 淡入（0.6s）
scale-in    - 缩放进入（0.4s）
blob        - 有机形状变化（7s循环）
```

#### 动画原则
- 使用 Framer Motion 实现复杂动画
- 页面加载时的渐进式动画（staggered animation）
- 交互时的即时反馈（hover, tap）
- 平滑的过渡效果（300ms cubic-bezier）

### 4. 组件设计

#### 基础组件
- **Button** - 5种变体（primary, secondary, outline, ghost, mood）
- **Card** - 玻璃态效果，悬停动画
- **Input** - 聚焦时的环形高亮
- **Slider** - 情绪强度滑块，动态颜色

#### 特色组件
- **MoodSelector** - 6宫格情绪选择器，带动画指示器
- **IntensitySlider** - 自定义滑块，实时颜色反馈
- **TagSelector** - 多选标签，圆角胶囊设计
- **AnimatedBackground** - 动态渐变背景，跟随鼠标移动

### 5. 视觉效果

#### 玻璃态（Glassmorphism）
```css
backdrop-blur-md
bg-white/80 dark:bg-gray-900/80
border-2 border-white/50
```

#### 发光效果
```css
shadow-glow-sm  - 小发光
shadow-glow-md  - 中发光
shadow-glow-lg  - 大发光
shadow-mood     - 情绪色发光
```

#### 有机形状
```css
border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%
```

---

## 🎯 独特设计特点

### 1. 动态背景系统
- 3个动态光斑，跟随鼠标移动
- 渐变网格背景
- 噪点纹理增加质感
- 支持深色/浅色模式

### 2. 情绪驱动的视觉反馈
- 选择情绪后，整个界面的主色调会变化
- 按钮、滑块、边框都会使用情绪色
- 发光效果增强情绪表达

### 3. 渐进式动画
- 页面加载时，元素依次出现
- 每个元素都有独特的延迟时间
- 创造流畅的视觉节奏

### 4. 微交互设计
- 悬停时的缩放效果
- 点击时的缩小反馈
- 选中时的指示器动画
- 滑块拖动时的涟漪效果

---

## 📦 组件库

### 已创建的组件

```
src/components/
├── ui/
│   ├── button.tsx          - 按钮组件
│   ├── card.tsx            - 卡片组件
│   └── input.tsx           - 输入框组件
├── animated-background.tsx - 动态背景
├── mood-selector.tsx       - 情绪选择器
├── intensity-slider.tsx    - 强度滑块
└── tag-selector.tsx        - 标签选择器
```

### 工具函数

```
src/lib/
├── utils.ts  - 工具函数（cn, getMoodColor, getMoodEmoji等）
├── api.ts    - API 客户端
└── types.ts  - TypeScript 类型定义
```

---

## 🚀 使用指南

### 安装依赖
```bash
cd frontend
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
npm start
```

---

## 🎨 设计灵感

### 避免的设计模式（AI Slop）
❌ 通用字体（Inter, Roboto, Arial）
❌ 紫色渐变在白色背景上
❌ 千篇一律的布局
❌ 缺乏个性的设计

### 采用的设计方向
✅ 独特的字体组合（Outfit + Sora）
✅ 情绪驱动的动态配色
✅ 有机的形状和动画
✅ 玻璃态和发光效果
✅ 沉浸式的交互体验

---

## 📱 响应式设计

### 断点
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 移动端优化
- 触摸友好的按钮大小（最小 44x44px）
- 简化的布局（3列变2列变1列）
- 优化的动画性能
- 自适应的字体大小

---

## 🌙 深色模式

### 实现方式
- 使用 Tailwind 的 `dark:` 前缀
- CSS 变量支持主题切换
- 自动适配系统主题

### 深色模式配色
- 背景：#0F0F0F, #1A1A1A, #262626
- 文字：#FAFAFA, #A3A3A3, #737373
- 边框：#262626, #404040

---

## 🎭 动画性能优化

### 最佳实践
1. 使用 `transform` 和 `opacity` 进行动画
2. 避免动画 `width`, `height`, `top`, `left`
3. 使用 `will-change` 提示浏览器
4. 使用 `requestAnimationFrame` 进行复杂动画
5. 减少重绘和重排

---

## 📚 学习资源

### 设计灵感
- [Dribbble](https://dribbble.com) - 设计灵感
- [Awwwards](https://www.awwwards.com) - 优秀网站
- [Behance](https://www.behance.net) - 设计作品

### 技术文档
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com)

---

## 🎯 下一步计划

### 待实现的功能
1. 日历组件（日期选择）
2. 图表组件（数据可视化）
3. 音乐播放器（音频可视化）
4. 日记列表（历史记录）
5. 设置页面（主题切换、偏好设置）

### 待优化的部分
1. 性能优化（懒加载、代码分割）
2. 无障碍支持（ARIA 标签、键盘导航）
3. 国际化（多语言支持）
4. PWA 支持（离线访问）

---

## 💡 设计哲学

> "好的设计不仅仅是美观，更是情感的传递。MoodWave 通过独特的视觉语言，帮助用户更好地理解和表达自己的情绪。"

### 核心价值
1. **情感共鸣** - 设计应该触动人心
2. **简洁优雅** - 复杂的功能，简单的交互
3. **独特个性** - 避免千篇一律的设计
4. **用户至上** - 一切设计服务于用户体验

---

## 📝 更新日志

### v0.1.0 (2026-02-10)
- ✅ 创建设计系统（色彩、字体、动画）
- ✅ 实现基础 UI 组件库
- ✅ 创建情绪选择器
- ✅ 实现动态背景系统
- ✅ 完成主页设计

---

**设计师**: Claude (Anthropic)
**技术栈**: Next.js 14 + Tailwind CSS + Framer Motion
**设计理念**: 有机治愈 × 现代极简
