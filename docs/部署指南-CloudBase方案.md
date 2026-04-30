# MoodWave 灵音 · CloudBase 部署方案（玩虾大赛素材 + 备选方案）

> 📅 2026-04-30 Day 7
> 🎯 目标：将前端静态文件托管到腾讯云 CloudBase，获取玩虾大赛截图素材
> 🔗 CloudBase 控制台：https://console.cloud.tencent.com/tcb
> ⚠️ 本方案只托管前端静态文件，后端 API 仍然指向腾讯云服务器

---

## 一、CloudBase 是什么？在本项目中扮演什么角色？

```
┌──────────────────────────────────────────────────┐
│                  部署矩阵                         │
│                                                  │
│  前端：Vercel (主力) + CloudBase (备选/素材)       │
│  后端：腾讯云服务器 Docker Compose (只有一套)       │
│                                                  │
│  为什么还需要 CloudBase？                         │
│  ✅ OpenClaw 玩虾大赛 要求有 CloudBase 部署截图     │
│  ✅ 展示"多云部署"能力，比赛加分                    │
│  ✅ CloudBase 是腾讯生态，PCG 评委有好感            │
│  ✅ 静态托管免费额度够用                           │
└──────────────────────────────────────────────────┘
```

---

## 二、CloudBase MCP 配置（连接 WorkBuddy）

CloudBase 确实有 MCP，叫 **CloudBase AI ToolKit**，可以直接在 WorkBuddy 中配置，让 AI 帮你操作 CloudBase。

### 2.1 开通 CloudBase 环境

```
1. 打开 https://console.cloud.tencent.com/tcb
2. 点击「新建环境」
3. 选择「按量计费」（有免费额度）
4. 环境名称：moodwave
5. 地域：选择离你最近的
6. 创建完成后，记录「环境 ID」（例如：moodwave-xxxxx）
```

### 2.2 获取 API 密钥

```
1. 打开 https://console.cloud.tencent.com/cam/capi
2. 点击「新建密钥」
3. 记录：
   - SecretId: AKIDxxxxxxxxxxxxx
   - SecretKey: xxxxxxxxxxxxxxxxx
```

### 2.3 在 WorkBuddy 中配置 MCP

在 WorkBuddy 设置中找到 MCP 配置（`~/.workbuddy/mcp.json`），添加：

```json
{
  "mcpServers": {
    "cloudbase": {
      "command": "npx",
      "args": ["@cloudbase/cloudbase-mcp@latest"],
      "env": {
        "TENCENT_SECRET_ID": "你的SecretId",
        "TENCENT_SECRET_KEY": "你的SecretKey",
        "TCB_ENV_ID": "你的环境ID"
      }
    }
  }
}
```

配置后 WorkBuddy 可以直接调用 CloudBase 的：
- 静态网站托管（上传/部署）
- 云函数（部署后端逻辑）
- 云数据库（NoSQL）
- 云存储（图片/文件）

---

## 三、方案 A：CloudBase 静态网站托管（推荐，30 分钟完成）

这是最简单的方案，只托管前端静态文件。

### 步骤 1：构建前端静态文件

```bash
cd /Users/LYQ/Desktop/大三资料/我的vibe-coding项目/情绪日记+可视化音乐项目/frontend

# 修改 next.config 支持静态导出
# 在 next.config.js 中添加: output: 'export'

# 构建
npm run build
# 输出目录: frontend/out/

# 确认构建成功
ls out/
# 应该看到: index.html, 404.html, _next/, ...
```

### 步骤 2：配置环境变量

在 `next.config.js` 中静态导出时需要设置 API 地址：

```js
// next.config.js
const nextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_API_URL: 'http://你的服务器IP:8000',
  },
  images: {
    unoptimized: true,  // 静态导出必须
  },
}
```

### 步骤 3：上传到 CloudBase

**方法 1：通过 CloudBase 控制台手动上传**
```
1. 打开 https://console.cloud.tencent.com/tcb
2. 进入你的环境 → 静态网站托管
3. 点击「上传文件」→ 选择 frontend/out/ 目录下所有文件
4. 等待上传完成
5. 获得默认域名: https://moodwave-xxxxx.tcloudbaseapp.com
```

**方法 2：通过 CLI 上传（推荐）**
```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 上传
tcb hosting deploy frontend/out/ -e 你的环境ID
```

### 步骤 4：验证

```
✅ 打开 https://moodwave-xxxxx.tcloudbaseapp.com
✅ 确认页面正常加载
✅ 确认 API 调用正常（注意浏览器控制台 Network 面板）
✅ 截图！！（玩虾大赛必须的 CloudBase 控制台截图）
```

---

## 四、方案 B：CloudBase 云函数托管后端（高级，需要 2-3 小时）

⚠️ **不推荐现在做**，因为：
- 需要把 FastAPI 重写为 CloudBase 云函数（Node.js）
- 需要把 PostgreSQL 迁移到 CloudBase 云数据库（NoSQL）
- 工作量大，且已有 Docker 方案可用

但如果为了比赛的"全栈 CloudBase"噱头，可以做一个简化版：

```
CloudBase 云函数:
  - moodwave-api (主函数) → 处理 /api/* 请求
  - 使用 tcb-router 做路由
  - 云数据库替代 PostgreSQL

CloudBase 云数据库:
  - moods 集合 (情绪记录)
  - users 集合 (用户)
  - posts 集合 (社区帖子)

CloudBase 云存储:
  - 图片/音频上传
```

---

## 五、玩虾大赛截图清单

| 截图内容 | 在哪里截 | 用途 |
|----------|----------|------|
| CloudBase 控制台首页 | console.cloud.tencent.com/tcb | 展示"腾讯云 CloudBase 环境" |
| 静态网站托管页面上传成功 | 控制台 → 静态网站托管 | 展示部署过程 |
| tcloudbaseapp.com 访问成功 | 浏览器打开 | 展示部署结果 |
| Vercel 部署成功 | vercel.com Dashboard | 展示前端自动部署 |
| Docker 服务运行状态 | 服务器 `docker compose ps` | 展示后端部署 |
| curl API 返回 healthy | 终端 | 展示后端正常运行 |

**关键！** 玩虾大赛文章必须包含 CloudBase 截图。

---

## 六、CloudBase MCP 自动化部署（进阶）

如果配置了 CloudBase MCP，可以在 WorkBuddy 中直接用自然语言操作：

```
# 示例对话（配置 MCP 后）:
你: "帮我把 frontend/out/ 目录部署到 CloudBase 静态托管"
WorkBuddy: [自动调用 MCP 工具完成部署]

你: "查看 CloudBase 的访问地址"
WorkBuddy: "你的网站地址是 https://moodwave-xxxxx.tcloudbaseapp.com"

你: "截图 CloudBase 控制台的部署状态"
WorkBuddy: [自动截图]
```

---

## 七、当前推荐的最终部署架构

```
┌──────────────┐     ┌──────────────────────┐
│   Vercel     │────▶│  腾讯云轻量服务器      │
│  (主力前端)   │ API │  Docker Compose       │
│  .vercel.app │◀────│  FastAPI + PG + Nginx │
└──────────────┘     └──────────────────────┘

┌──────────────┐
│  CloudBase   │     用途：玩虾大赛素材
│  (备选前端)   │           PCG 比赛加分
│  .tcloudbase │          静态托管截图
│  app.com     │
└──────────────┘
```

**一句话总结**：
- 前端主力用 Vercel（已经部署好了）
- 后端主力用腾讯云 Docker Compose（今天部署）
- CloudBase 托管前端静态文件作为备选（用于比赛素材）
