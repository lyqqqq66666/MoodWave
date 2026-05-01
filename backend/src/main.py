"""
MoodWave Backend - FastAPI 应用入口

这是 MoodWave 应用的后端服务，提供情绪日记、数据分析和音乐推荐的 API。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from src.db.database import create_db_and_tables
from src.api import moods, analytics, music, upload, ai, posts, auth

# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭事件"""
    # 启动事件
    create_db_and_tables()
    print("✅ 数据库初始化完成")
    yield
    # 关闭事件
    print("👋 应用关闭")

# 创建 FastAPI 应用
app = FastAPI(
    title="MoodWave API",
    description="情绪日记与可视化音乐 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有源，生产环境应该限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(moods.router, prefix="/api", tags=["moods"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(music.router, prefix="/api", tags=["music"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(posts.router, prefix="/api", tags=["posts"])

# 健康检查端点
@app.get("/api/health")
async def health_check():
    """
    健康检查端点

    Returns:
        dict: 包含状态信息的字典
    """
    return {
        "status": "healthy",
        "service": "MoodWave API",
        "version": "0.1.0",
    }

# 根路由
@app.get("/")
async def root():
    """
    根路由

    Returns:
        dict: 欢迎信息
    """
    return {
        "message": "欢迎使用 MoodWave API",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }

# 托管上传的静态文件（本地开发用，生产环境由 Nginx 接管）
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
