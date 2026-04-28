# 🎵 MoodWave - 情绪日记与可视化音乐

一个基于 Web 的情绪日记应用，包含情绪录入、数据分析、基于情绪的音乐推荐及可视化效果。

## 🎯 核心功能

- 📝 **情绪日记录入** - 选择日期、表情、强度、标签和描述
- 📊 **数据分析与可视化** - 周期情绪波动图、情绪构成饼图
- 🎵 **音乐推荐与可视化** - 基于情绪的音乐推荐和音频可视化
- 📈 **每日汇总** - 生成结构化的日记总结

## 🛠 技术栈

- **前端**: Next.js 14 + Tailwind CSS + Shadcn/UI
- **后端**: Python FastAPI
- **数据库**: SQLite
- **可视化**: React Three Fiber / Canvas API
- **音频**: Web Audio API + Tone.js

## 📂 项目结构

```
MoodWave/
├── frontend/          # Next.js 前端项目
├── backend/           # FastAPI 后端项目
├── memory-bank/       # AI 上下文管理
├── docker-compose.yml # 容器编排
└── README.md
```

## 🚀 快速开始

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```

### Docker 启动
```bash
docker-compose up
```

## 📅 开发计划

- **Day 1**: 基础设施与 UI 框架
- **Day 2**: 核心功能 - 情绪录入
- **Day 3**: 数据分析与小贴士
- **Day 4**: 音乐生成/推荐与可视化
- **Day 5**: 整合与日记生成
- **Day 6**: 软著材料准备
- **Day 7**: 缓冲日

## 📄 许可证

MIT
