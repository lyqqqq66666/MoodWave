# **🎵 项目名称：MoodWave (暂定) \- 情绪日记与可视化音乐**

**目标**：在一周内构建一个基于 Web 的情绪日记应用，包含情绪录入、数据分析、基于情绪的音乐推荐及可视化效果。

**核心理念**：Vibe Coding (规划驱动 \+ AI 结对编程)

**软著策略**：优先完成界面（UI）和核心业务逻辑闭环，确保有足够的截图和代码量用于申请。

## **🛠 0\. 环境与工具准备 (Day 0\)**

基于你的要求，我们将采用以下 Tech Stack (技术栈)：

* **IDE**: VS Code (安装 Claude Code 扩展 或 使用 Cursor/Antigravity)  
* **Frontend**: Next.js 14 (App Router) \+ Tailwind CSS \+ Shadcn/UI (配合 V0 设计)  
* **Visualization**: React Three Fiber (3D 效果) 或 Canvas API (音频可视化)  
* **Backend**: Python (FastAPI) \- 适合快速开发且方便集成数据分析算法  
* **Database**: SQLite (MVP 阶段最快，无需配置服务器，方便迁移)  
* **Design**: V0.dev (生成 UI 组件)

### **📂 目录结构初始化 (遵循 Vibe Coding memory-bank 模式)**

在项目根目录下创建一个 memory-bank 文件夹，并创建以下文件（这是让 AI 保持上下文的关键）：

1. memory-bank/productContext.md (产品需求文档)  
2. memory-bank/techContext.md (技术栈说明)  
3. memory-bank/activeContext.md (当前正在进行的任务)  
4. memory-bank/progress.md (进度记录)

## **📅 第一阶段：MVP 快速构建 (Day 1 \- Day 7\)**

### **Day 1: 基础设施与 UI 框架 (The Skeleton)**

**任务**：搭建前后端框架，用 V0 生成核心页面 UI。

1. **V0 UI 生成**:  
   * 去 V0.dev 输入提示词：*"生成一个情绪日记的 Web App 仪表盘。左侧是导航栏，中间是日历视图和情绪输入卡片（包含表情选择、强度滑块、文本域），右侧是本周情绪曲线图。配色风格现代、治愈，支持深色模式。"*  
   * **Action**: 将生成的 React 代码复制到你的 Next.js 项目中。  
2. **后端初始化**:  
   * 初始化 FastAPI 项目。  
   * 定义核心数据模型 (Pydantic models): MoodEntry (日期, 关键词, 强度, 表情, 描述, 标签/方面).  
3. **Vibe Prompt (Claude Code/Cursor)**:"阅读 memory-bank 下的所有文件。我需要初始化一个 Next.js \+ FastAPI 的全栈项目。请帮我创建前后端连接的基础结构（CORS配置、API Client封装）。确保前端可以直接调用后端的 /health 接口。"

### **Day 2: 核心功能 \- 情绪录入 (The Core)**

**任务**：实现“选择日期 \-\> 记录情绪”的完整流程。

1. **数据库设计**:  
   * 使用 SQLModel (结合了 SQLAlchemy 和 Pydantic) 定义 SQLite 表结构。  
   * **Field**: id, user\_id, date, mood\_type (如: happy, sad), intensity (1-10), tags (work, love...), note.  
2. **前端交互**:  
   * 实现日历组件（推荐 react-day-picker）。  
   * 实现表单提交逻辑。  
3. **软著加分项**:  
   * 在这个阶段，代码量会迅速增加。确保每个 API 都有详细的 Docstring（Python文档注释），这可以直接用于软著的代码文档材料。

### **Day 3: 数据分析与小贴士 (The Logic)**

**任务**：后端算法实现与前端图表展示。

1. **情绪分析算法 (Python)**:  
   * **MVP 策略**: 暂时不需要训练大模型。使用 TextBlob 或 SnowNLP (中文友好) 进行基础的情感极性分析。  
   * 编写一个简单的规则引擎：if mood\_score \< 3: return "建议休息，听点舒缓的音乐"。  
2. **可视化图表**:  
   * 安装 recharts。  
   * 实现“每周情绪波动图”（折线图）和“情绪构成饼图”。  
3. **Vibe Prompt**:"我需要一个 Python 函数，接收过去7天的情绪记录，返回一个 JSON 对象，包含：1. 平均情绪分；2. 最高频的情绪关键词；3. 基于这些数据的一条简短生活建议。请实现这个逻辑并暴露为 API。"

### **Day 4: 音乐生成/推荐与可视化 (The Wow Factor)**

**任务**：这是最酷的部分，也是软著的亮点。

1. **音乐策略 (MVP)**:  
   * **生成 (难)**: 一周内实现高质量生成很难。建议使用 Tone.js 在前端生成基于情绪的“氛围白噪音”（如：焦虑 \-\> 雨声+低频；开心 \-\> 欢快节奏）。  
   * **推荐 (易)**: 建立一个静态的映射表 (JSON)，将情绪关键词映射到现有的免费/无版权音乐 URL (如 Pixabay Music)。  
   * *你的需求提到网易云/QQ音乐*：MVP阶段建议**不要**直接爬取或集成未授权 API（有法律风险且不稳定）。建议用本地 Demo 音频文件代替，演示功能即可。  
2. **音频可视化 (Audio Visualization)**:  
   * 使用 Web Audio API 获取音频频段数据 (AnalyserNode)。  
   * 使用 React Three Fiber 或 HTML5 Canvas 绘制波形或粒子效果。当音乐播放时，粒子随节奏跳动。  
3. **Vibe Prompt**:"创建一个 React 组件 MusicVisualizer。它接收一个音频 URL，使用 Web Audio API 分析频率，并用 Canvas 渲染一个随低音（Bass）震动的圆形波纹效果。请给出完整代码。"

### **Day 5: 整合与日记生成 (The Integration)**

**任务**：将零散功能整合成“每日日记”页面。

1. **每日汇总页**:  
   * 展示：日期 \+ 你的描述 \+ 分析结果 \+ 推荐的歌曲卡片 \+ 可视化播放器。  
   * 实现“生成日记”按钮：调用后端，将所有数据拼接成一篇结构化的 Markdown 或 HTML 存入数据库。

### **Day 6: 软著材料准备与 Debug (The Paperwork)**

**任务**：为申请软著做准备。

1. **截屏**: 截取所有核心功能页面（日历、录入、分析图表、音乐播放器）。  
2. **代码导出**: 使用脚本将 src 和 app 目录下的代码合并成一个 PDF 或 Word 文档（软著通常需要前后各30页代码）。  
3. **Bug 修复**: 确保演示流程不崩溃。

### **Day 7: 备用缓冲日 (Buffer)**

* 处理未完成的功能，或者优化 UI 细节。

## **🚀 第二阶段：扩展功能 (Post-MVP)**

**在提交软著申请后，开始开发以下功能：**

### **1\. 社区分享 (Social)**

* **后端**: 增加 User 表和 Post 表。实现 JWT Authentication (登录注册)。  
* **功能**:  
  * “公开日记”开关。  
  * 匿名广场（树洞模式）。  
  * 点赞与评论系统。

### **2\. 移动端适配与小组件 (Mobile)**

* **PWA (Progressive Web App)**: 配置 manifest.json，让网页可以像 App 一样安装在手机上。这是最快的“App上线”方式。  
* **小组件**: 如果必须原生小组件，需要使用 Swift (iOS) 或 Kotlin (Android)，或者使用 React Native 重构前端。  
* **每日推荐**: 利用 Python 后端设置定时任务 (Cron Job)，每天凌晨生成当天的推荐内容。

### **3\. 高级算法 (AI)**

* 接入 DeepSeek 或 OpenAI API，根据用户的日记内容，生成更有深度的心理分析报告，而不仅是简单的规则判断。

## **🤖 Antigravity & Stitch 技巧 (你的秘密武器)**

在使用 Claude Code 或 Cursor 时，使用以下技巧提高效率：

1. **Tagging Skills**: 如果你安装了 antigravity-awesome-skills，在 Prompt 中显式调用技能：  
   * 前端开发时：@nextjs @tailwind @react-patterns 请帮我实现情绪选择器组件...  
   * 后端开发时：@python-expert @fastapi 请优化这个数据分析接口...  
2. **Stitch 模式**:  
   * 当你遇到复杂的 UI 问题（比如音乐可视化卡顿），不要让 AI 一次性重写整个文件。  
   * Prompt: *"只修改 Visualizer.tsx 中的 draw() 函数，保持其他部分不变。我想让波纹颜色随情绪强度变化。"*  
3. **Context Freeze**:  
   * 每天开始工作前，更新 memory-bank/progress.md。  
   * Prompt: *"读取 memory-bank。我们要开始 Day 3 的工作了，今天的目标是实现可视化图表..."*

## **💡 软著申请特别提示**

申请软著通常需要：

1. **用户手册**: 可以在 Vibe Coding 流程最后，把 memory-bank/productContext.md 喂给 AI，让它生成一份“用户操作手册”。  
2. **源代码**: 需要提供前后端核心代码。  
3. **软件环境**: 在文档中写明 Python, React, Next.js 等环境。

祝你的项目开发顺利！现在，去创建你的 memory-bank 文件夹吧！