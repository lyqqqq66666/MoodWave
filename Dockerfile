# ============================================
# MoodWave 灵音 - CloudRun 一体化 Dockerfile
# 前端 (Next.js) + 后端 (FastAPI) + Nginx
# ============================================

# ---- Stage 1: Build Next.js 前端 ----
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./

RUN npm ci

COPY frontend/ ./

ENV NEXT_OUTPUT=export
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build

# ---- Stage 2: Final Image ----
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/nginx

# ---- 安装 Python 依赖 ----
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# ---- 复制后端代码 ----
COPY backend/ ./backend/

# ---- 复制前端构建产物 ----
COPY --from=frontend-builder /frontend/out ./frontend

# ---- 复制 Nginx 配置 ----
COPY nginx.cloudrun.conf /etc/nginx/nginx.conf

# ---- 启动脚本 ----
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting Nginx..."\n\
nginx\n\
echo "Starting FastAPI..."\n\
cd /app/backend\n\
exec uvicorn src.main:app --host 127.0.0.1 --port 8000' > /app/start.sh \
    && chmod +x /app/start.sh

ENV PORT=80

EXPOSE 80

CMD ["/app/start.sh"]
