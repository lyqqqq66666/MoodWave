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

# CloudRun 健康检查默认 80 端口，docker-compose 通过环境变量覆盖为 8000
ENV PORT=80

EXPOSE ${PORT}

CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT}
