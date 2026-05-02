FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（psycopg2 需要 libpq-dev）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# CloudRun 注入 PORT 环境变量，docker-compose 默认用 8000
ENV PORT=8000

EXPOSE ${PORT}

CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT}
