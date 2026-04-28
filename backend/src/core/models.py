"""
数据模型定义

使用 SQLModel 定义数据库模型和 Pydantic 模型
"""

from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field
from pydantic import BaseModel

# ==================== 数据库模型 ====================

class MoodEntryBase(SQLModel):
    """情绪记录基础模型"""
    date: str = Field(index=True)
    mood_type: str = Field(index=True)  # happy, calm, anxious, angry, sad, neutral
    intensity: int = Field(ge=1, le=10)  # 1-10 的强度
    tags: str = Field(default="[]")  # JSON字符串，存储标签列表
    note: str = Field(default="")  # 描述文本


class MoodEntry(MoodEntryBase, table=True):
    """情绪记录数据库模型"""
    __tablename__ = "mood_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1, index=True)  # MVP 阶段使用固定用户
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== 请求/响应模型 ====================

class MoodEntryCreate(SQLModel):
    """创建情绪记录的请求模型（接口层，接受数组）"""
    date: str
    mood_type: str
    intensity: int
    tags: List[str] = []  # 前端传数组
    note: str = ""


class MoodEntryUpdate(BaseModel):
    """更新情绪记录的请求模型"""
    date: Optional[str] = None
    mood_type: Optional[str] = None
    intensity: Optional[int] = None
    tags: Optional[str] = None  # 前端传JSON字符串，接口层转换
    note: Optional[str] = None


class MoodEntryResponse(SQLModel):
    """情绪记录的响应模型（tags 返回数组）"""
    id: int
    date: str
    mood_type: str
    intensity: int
    tags: List[str]  # 返回数组给前端
    note: str
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WeeklyAnalyticsResponse(BaseModel):
    """周期分析响应模型"""
    average_mood_score: float
    mood_distribution: dict
    top_keywords: List[str]
    top_tags: List[str]
    daily_scores: List[dict]


class MoodSummaryResponse(BaseModel):
    """情绪汇总响应模型"""
    average_mood_score: float
    highest_mood: str
    lowest_mood: str
    suggestion: str


class MusicRecommendationResponse(BaseModel):
    """音乐推荐响应模型"""
    id: str
    title: str
    artist: str
    mood_type: str
    url: str
    duration: int


class HealthCheckResponse(BaseModel):
    """健康检查响应模型"""
    status: str
    service: str
    version: str


# ==================== 社区帖子模型 ====================

class PostBase(SQLModel):
    """帖子基础模型"""
    content: str = Field(default="")
    mood_id: Optional[int] = Field(default=None)
    is_anonymous: bool = Field(default=True)
    category: str = Field(default="general")  # general / study / emotion / vent


class Post(PostBase, table=True):
    """帖子数据库模型"""
    __tablename__ = "posts"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1, index=True)
    likes_count: int = Field(default=0)
    comments_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PostCreate(SQLModel):
    """创建帖子请求"""
    content: str
    mood_id: Optional[int] = None
    is_anonymous: bool = True
    category: str = "general"


class PostResponse(SQLModel):
    """帖子响应"""
    id: int
    content: str
    category: str
    author_label: str  # "匿名" 或 "大三 · INFP" 等
    likes_count: int
    comments_count: int
    created_at: datetime
    user_mood_type: Optional[str] = None  # 关联的情绪类型，用于显示 emoji

    class Config:
        from_attributes = True


class PostListResponse(SQLModel):
    """帖子列表响应"""
    posts: List[PostResponse]
    total: int
    page: int
    page_size: int
