# CloudBase MCP 与 SMTP 配置

## 当前结论

- Codex 当前可安装插件列表里没有 CloudBase 插件，不能一键安装 CloudBase MCP。
- 项目使用的 CloudBase 环境 ID 是 `moodwave-d1goq3vwib5df0121`，区域是 `ap-shanghai`。
- 邮箱验证码服务只读取后端运行环境变量，不读取前端环境变量。
- SMTP 必须配置在 CloudBase/CloudRun 后端运行环境，或本地 `backend/.env`。

## CloudBase MCP 手动配置

在 Codex/WorkBuddy 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "cloudbase": {
      "command": "npx",
      "args": ["@cloudbase/cloudbase-mcp@latest"],
      "env": {
        "TENCENT_SECRET_ID": "你的腾讯云 CAM SecretId",
        "TENCENT_SECRET_KEY": "你的腾讯云 CAM SecretKey",
        "TCB_ENV_ID": "moodwave-d1goq3vwib5df0121"
      }
    }
  }
}
```

需要先在腾讯云 CAM 控制台创建密钥。不要把 `SecretId` / `SecretKey` 写进仓库。

## SMTP 环境变量

后端需要以下变量：

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_TLS=false
SMTP_SSL=true
```

推荐优先使用 Brevo 这类 SMTP 服务。也可以用 QQ、网易、Gmail，但要填写 SMTP 授权码或应用专用密码，不是邮箱登录密码。

网易个人邮箱建议配置：

```bash
# 163 邮箱
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=你的完整邮箱地址
SMTP_PASSWORD=网易客户端授权码
SMTP_FROM=你的完整邮箱地址
SMTP_TLS=false
SMTP_SSL=true

# 126 邮箱把 SMTP_HOST 改成 smtp.126.com
# yeah.net 邮箱把 SMTP_HOST 改成 smtp.yeah.net
```

## CloudBase / CloudRun 配置位置

生产环境优先在 CloudBase 控制台的 CloudRun 服务环境变量中配置：

```bash
DATABASE_URL=postgresql://moodwave:新的数据库密码@106.52.8.176:5432/moodwave
APP_ENV=production
APP_SECRET_KEY=新的强随机密钥
DEEPSEEK_API_KEY=新的 DeepSeek Key
DASHSCOPE_API_KEY=新的 DashScope Key
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=你的完整网易邮箱地址
SMTP_PASSWORD=网易客户端授权码
SMTP_FROM=你的完整网易邮箱地址
SMTP_TLS=false
SMTP_SSL=true
```

`backend/cloudbaserc.json` 只保留占位值，部署前必须替换或用控制台环境变量覆盖。

## 密钥轮换清单

已经在聊天和旧配置中暴露过的值都应轮换：

- DeepSeek API Key
- DashScope API Key
- PostgreSQL 用户 `moodwave` 的密码
- `APP_SECRET_KEY`
- 后续创建的腾讯云 CAM SecretId / SecretKey

数据库密码轮换顺序：

1. 在 PostgreSQL 中修改 `moodwave` 用户密码。
2. 更新 CloudBase/CloudRun 的 `DATABASE_URL`。
3. 更新服务器或 Docker Compose 使用的 `DB_PASSWORD` / `DATABASE_URL`。
4. 重启后端服务并确认 `/api/health` 正常。
5. 删除旧密码相关记录，避免继续复用。

## 验证步骤

1. 本地填好 `backend/.env` 的 SMTP 变量。
2. 启动 FastAPI 后端。
3. 调用 `POST /api/auth/email-code`：

```bash
curl -X POST http://localhost:8000/api/auth/email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"你的邮箱","purpose":"register"}'
```

4. 收到验证码后完成注册。
5. 在 CloudBase/CloudRun 设置相同变量并重新部署，重复线上验证。
