"""
数据库配置和初始化

配置 SQLite 数据库连接和表创建
"""

import os
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

# 数据库 URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./moodwave.db")

# 创建引擎
# 对于 SQLite，使用 StaticPool 避免线程问题
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
    echo=False,  # 设置为 True 可以看到 SQL 语句
)


def create_db_and_tables():
    """
    创建数据库和所有表

    这个函数在应用启动时调用，确保所有表都已创建。
    注意：所有需要自动建表的模型必须在此文件里 import，
    否则 SQLModel.metadata 不知道它们的存在。
    """
    # 导入所有数据库模型（让 SQLModel.metadata 扫描到它们）
    from src.core.models import MoodEntry, Post  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    获取数据库会话

    这是一个依赖注入函数，用于 FastAPI 路由

    Yields:
        Session: 数据库会话
    """
    with Session(engine) as session:
        yield session
