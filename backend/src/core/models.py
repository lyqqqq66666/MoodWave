"""
数据模型定义

使用 SQLModel 定义数据库模型和 Pydantic 模型
"""

from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field
from pydantic import BaseModel
import os

# JWT 密钥（生产环境建议从环境变量读取）
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "moodwave-dev-secret-key-2024-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7


# ==================== 用户模型 ====================

class User(SQLModel, table=True):
    """用户数据库模型"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(index=True)
    hashed_password: str
    avatar_url: Optional[str] = Field(default=None)
    mbti: Optional[str] = Field(default=None)
    avatar_character: str = Field(default="cat")  # 灵音伙伴角色形象
    zodiac: str = Field(default="")  # 星座
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    """注册请求模型"""
    email: str
    username: str
    password: str


class UserLogin(BaseModel):
    """登录请求模型"""
    email: str
    password: str


class Token(BaseModel):
    """JWT Token 响应"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token 解析后的数据"""
    user_id: Optional[int] = None


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    email: str
    username: str
    avatar_url: Optional[str] = None
    mbti: Optional[str] = None
    avatar_character: str = "cat"
    zodiac: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """更新用户信息请求"""
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    mbti: Optional[str] = None
    avatar_character: Optional[str] = None
    zodiac: Optional[str] = None

# ==================== 数据库模型 ====================

class MoodEntryBase(SQLModel):
    """情绪记录基础模型"""
    date: str = Field(index=True)
    mood_type: str = Field(index=True)  # happy, calm, anxious, angry, sad, neutral
    intensity: int = Field(ge=1, le=10)  # 1-10 的强度
    tags: str = Field(default="[]")  # JSON字符串，存储标签列表
    note: str = Field(default="")  # 描述文本
    images: str = Field(default="[]")  # JSON字符串，图片URL列表
    image_analysis: str = Field(default="")  # qwen3-vl-plus 图片分析结果（JSON）
    voice_url: str = Field(default="")  # 语音文件URL
    voice_text: str = Field(default="")  # qwen3-asr-flash 语音转文字结果
    input_mode: str = Field(default="classic")  # classic/body_map/imagery/quick
    body_sensations: str = Field(default="")  # JSON字符串，身体体感结构化数据
    imagery_words: str = Field(default="")  # JSON字符串，意象词
    breath_state: str = Field(default="")  # rapid/shallow/steady/open
    voice_features: str = Field(default="")  # JSON字符串，语音基础特征
    music_goal: str = Field(default="")  # calm_down/sleep/energize/release/accompany
    emotion_vector: str = Field(default="")  # JSON字符串，多维情绪向量


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
    images: List[str] = []  # 图片URL数组
    image_analysis: Optional[str] = None  # AI分析结果
    voice_url: Optional[str] = None
    voice_text: Optional[str] = None
    input_mode: Optional[str] = None
    body_sensations: Optional[str] = None
    imagery_words: Optional[str] = None
    breath_state: Optional[str] = None
    voice_features: Optional[str] = None
    music_goal: Optional[str] = None
    emotion_vector: Optional[str] = None


class MoodEntryUpdate(BaseModel):
    """更新情绪记录的请求模型"""
    date: Optional[str] = None
    mood_type: Optional[str] = None
    intensity: Optional[int] = None
    tags: Optional[str] = None  # 前端传JSON字符串，接口层转换
    note: Optional[str] = None
    input_mode: Optional[str] = None
    body_sensations: Optional[str] = None
    imagery_words: Optional[str] = None
    breath_state: Optional[str] = None
    voice_features: Optional[str] = None
    music_goal: Optional[str] = None
    emotion_vector: Optional[str] = None


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


# ==================== 音乐收藏模型 ====================

class FavoriteMusic(SQLModel, table=True):
    """音乐收藏数据库模型"""
    __tablename__ = "favorite_music"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    music_id: str = Field(index=True)  # 音乐ID（来自推荐系统）
    title: str = Field(default="")
    artist: str = Field(default="MoodWave AI")
    mood_type: str = Field(default="calm")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class FavoriteMusicRequest(BaseModel):
    """收藏/取消收藏请求"""
    music_id: str
    title: str = ""
    artist: str = "MoodWave AI"
    mood_type: str = "calm"


class FavoriteMusicResponse(BaseModel):
    """收藏音乐响应"""
    id: int
    music_id: str
    title: str
    artist: str
    mood_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== 灵音伙伴会话模型 ====================

class CompanionConversation(SQLModel, table=True):
    """灵音伙伴会话数据库模型"""
    __tablename__ = "companion_conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    title: str = Field(default="")  # 会话标题（自动生成或用户命名）
    character: str = Field(default="cat")  # 伙伴形象 id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CompanionMessage(SQLModel, table=True):
    """灵音伙伴消息数据库模型"""
    __tablename__ = "companion_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(index=True)
    user_id: int = Field(index=True)
    role: str = Field(default="user")  # user / assistant / system
    content: str = Field(default="")
    mood_type: Optional[str] = Field(default=None)  # 关联情绪类型
    extra_data: str = Field(default="{}")  # JSON 字符串（存储额外信息）
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CompanionMemory(SQLModel, table=True):
    """灵音伙伴记忆数据库模型"""
    __tablename__ = "companion_memories"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    content: str = Field(default="")  # 记忆内容
    source: str = Field(default="ai")  # 来源：ai / rules
    memory_type: str = Field(default="personality")  # 记忆类型：personality / preference / habit / event
    mood_context: Optional[str] = Field(default=None)  # 情绪上下文
    tags: str = Field(default="[]")  # JSON 字符串，标签列表
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CompanionMemoryCreate(BaseModel):
    """创建记忆请求模型"""
    content: str
    source: str = "ai"
    memory_type: str = "personality"
    mood_context: Optional[str] = None
    tags: List[str] = []


class CompanionMemoryUpdate(BaseModel):
    """更新记忆请求模型"""
    content: Optional[str] = None
    source: Optional[str] = None
    memory_type: Optional[str] = None
    mood_context: Optional[str] = None
    tags: Optional[List[str]] = None


class CompanionMemoryResponse(BaseModel):
    """记忆响应模型"""
    id: int
    content: str
    source: str
    memory_type: str
    mood_context: Optional[str] = None
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
