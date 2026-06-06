"""
灵音伙伴 Agent 工具函数

为 LangGraph Agent 工作流提供数据访问和业务逻辑工具：
- 用户画像加载
- 情绪数据加载
- 记忆检索与保存
- 情绪分类
- 音乐推荐参数生成
"""

import json
import logging
from datetime import date, datetime
from typing import Optional, List
from sqlmodel import Session, select

from src.db.database import engine, SessionLocal
from src.core.models import (
    User, MoodEntry, CompanionMemory,
    CompanionConversation, CompanionMessage,
)
from src.services.ai_service import CHARACTER_PERSONAS
from src.services.music_catalog import get_companion_music_recommendation

logger = logging.getLogger("moodwave.companion_tools")


# ==================== 用户画像 ====================

def get_user_profile(user_id: int) -> dict:
    """
    加载用户画像信息

    Returns:
        dict: { avatar_character, mbti, zodiac, username }
    """
    with SessionLocal(engine) as session:
        user = session.get(User, user_id)
        if not user:
            logger.warning("get_user_profile: user %d not found", user_id)
            return {
                "avatar_character": "cat",
                "mbti": "",
                "zodiac": "",
                "username": "你",
            }
        return {
            "avatar_character": user.avatar_character or "cat",
            "mbti": user.mbti or "",
            "zodiac": user.zodiac or "",
            "username": user.username or "你",
        }


# ==================== 情绪数据 ====================

def get_today_mood(user_id: int) -> Optional[dict]:
    """
    获取用户当天最新情绪记录

    Returns:
        dict | None: { mood_type, intensity, note, tags, date } 或 None
    """
    with SessionLocal(engine) as session:
        today = date.today()
        statement = (
            select(MoodEntry)
            .where(MoodEntry.user_id == user_id)
            .where(MoodEntry.created_at >= str(today))
            .order_by(MoodEntry.created_at.desc())
            .limit(1)
        )
        entry = session.exec(statement).first()
        if not entry:
            return None

        tags = []
        if entry.tags:
            try:
                tags = json.loads(entry.tags) if isinstance(entry.tags, str) else entry.tags
            except (json.JSONDecodeError, TypeError):
                pass

        return {
            "mood_type": entry.mood_type,
            "intensity": entry.intensity or 5,
            "note": entry.note or "",
            "tags": tags,
            "date": str(entry.created_at.date()) if entry.created_at else "",
        }


def get_recent_moods(user_id: int, limit: int = 10) -> List[dict]:
    """
    获取用户最近 N 条情绪记录

    Returns:
        List[dict]: [{ mood_type, intensity, tags, note, date }]
    """
    with SessionLocal(engine) as session:
        statement = (
            select(MoodEntry)
            .where(MoodEntry.user_id == user_id)
            .order_by(MoodEntry.created_at.desc())
            .limit(limit)
        )
        entries = session.exec(statement).all()
        result = []
        for entry in entries:
            tags = []
            if entry.tags:
                try:
                    tags = json.loads(entry.tags) if isinstance(entry.tags, str) else entry.tags
                except (json.JSONDecodeError, TypeError):
                    pass
            result.append({
                "mood_type": entry.mood_type,
                "intensity": entry.intensity or 5,
                "tags": tags,
                "note": entry.note or "",
                "date": str(entry.created_at.date()) if entry.created_at else "",
            })
        return result


# ==================== 记忆检索与保存 ====================

def get_companion_memories(user_id: int, character: str = "cat", limit: int = 10) -> List[dict]:
    """
    检索用户的灵音伙伴记忆（优先级：最近 + 高相关）

    Returns:
        List[dict]: [{ id, content, memory_type, mood_context, tags, source }]
    """
    with SessionLocal(engine) as session:
        statement = (
            select(CompanionMemory)
            .where(CompanionMemory.user_id == user_id)
            .order_by(CompanionMemory.created_at.desc())
            .limit(limit)
        )
        memories = session.exec(statement).all()
        result = []
        for mem in memories:
            tags = []
            if mem.tags:
                try:
                    tags = json.loads(mem.tags) if isinstance(mem.tags, str) else mem.tags
                except (json.JSONDecodeError, TypeError):
                    pass
            result.append({
                "id": mem.id,
                "content": mem.content,
                "memory_type": mem.memory_type,
                "mood_context": mem.mood_context,
                "tags": tags,
                "source": mem.source,
            })
        return result


def save_companion_memory(
    user_id: int,
    content: str,
    memory_type: str = "personality",
    mood_context: Optional[str] = None,
    tags: List[str] = None,
    source: str = "ai",
) -> Optional[int]:
    """
    保存一条新的伙伴记忆

    Returns:
        int | None: 新记忆的 ID，失败返回 None
    """
    try:
        with SessionLocal(engine) as session:
            memory = CompanionMemory(
                user_id=user_id,
                content=content,
                source=source,
                memory_type=memory_type,
                mood_context=mood_context,
                tags=json.dumps(tags or []),
            )
            session.add(memory)
            session.commit()
            session.refresh(memory)
            logger.info("save_companion_memory: id=%d user=%d", memory.id, user_id)
            return memory.id
    except Exception as e:
        logger.error("save_companion_memory error: %s", str(e)[:200])
        return None


def save_companion_memories_batch(
    user_id: int,
    memories: List[dict],
    source: str = "ai",
) -> List[int]:
    """
    批量保存伙伴记忆

    Args:
        memories: [{ content, memory_type, mood_context, tags }]

    Returns:
        List[int]: 成功保存的记忆 ID 列表
    """
    saved_ids = []
    try:
        with SessionLocal(engine) as session:
            for mem in memories:
                memory = CompanionMemory(
                    user_id=user_id,
                    content=mem.get("content", ""),
                    source=source,
                    memory_type=mem.get("memory_type", "personality"),
                    mood_context=mem.get("mood_context"),
                    tags=json.dumps(mem.get("tags", [])),
                )
                session.add(memory)
                session.flush()
                saved_ids.append(memory.id)
            session.commit()
            logger.info("save_companion_memories_batch: saved %d memories for user %d", len(saved_ids), user_id)
    except Exception as e:
        logger.error("save_companion_memories_batch error: %s", str(e)[:200])
    return saved_ids


# ==================== 情绪分类（规则引擎） ====================

# 情绪标签映射表
EMOTION_KEYWORDS = {
    "happy": ["开心", "高兴", "快乐", "幸福", "兴奋", "喜悦", "满足", "棒", "好开心", "哈哈"],
    "calm": ["平静", "放松", "安静", "宁静", "舒适", "安心", "惬意", "还好", "一般"],
    "anxious": ["焦虑", "紧张", "担心", "害怕", "不安", "压力", "烦躁", "急", "崩溃"],
    "angry": ["生气", "愤怒", "烦", "讨厌", "气死", "不公平", "憋屈", "怒"],
    "sad": ["难过", "伤心", "悲伤", "低落", "失落", "哭", "心痛", "想哭", "沮丧"],
    "neutral": [],
}


def classify_emotion_by_rules(
    text: str,
    mood_type: str = "neutral",
    intensity: int = 5,
    tags: List[str] = None,
) -> dict:
    """
    基于规则的情绪分类（Agent 节点使用，不调用 AI）

    综合文字内容 + 前端传入的 mood_type + 强度 + 标签，给出分类结果。

    Returns:
        dict: { mood_type, intensity, confidence, keywords_found }
    """
    text_lower = text.lower() if text else ""
    keywords_found = []
    scores = {mood: 0 for mood in EMOTION_KEYWORDS}

    # 文字关键词匹配
    for mood, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                scores[mood] += 1
                keywords_found.append(kw)

    # 前端 mood_type 加权（权重 = 2）
    if mood_type in scores:
        scores[mood_type] += 2

    # 标签加权
    tag_mood_map = {
        "study": "anxious", "work": "anxious", "social": "neutral",
        "emotion": "sad", "health": "calm", "life": "neutral",
    }
    if tags:
        for tag in tags:
            mapped = tag_mood_map.get(tag)
            if mapped and mapped in scores:
                scores[mapped] += 1

    # 找最高分
    max_score = max(scores.values())
    if max_score > 0:
        best_mood = max(scores, key=scores.get)
        confidence = min(max_score / 5.0, 1.0)
    else:
        best_mood = mood_type or "neutral"
        confidence = 0.3

    return {
        "mood_type": best_mood,
        "intensity": intensity,
        "confidence": round(confidence, 2),
        "keywords_found": keywords_found,
    }


# ==================== 音乐推荐参数 ====================

# 情绪 → 音乐参数映射
MUSIC_PARAMS = {
    "happy": {"bpm": 120, "energy": "high", "texture": "明亮节奏 + 欢快旋律", "style": "pop"},
    "calm": {"bpm": 70, "energy": "low", "texture": "柔和钢琴 + 自然白噪音", "style": "ambient"},
    "anxious": {"bpm": 80, "energy": "medium", "texture": "舒缓弦乐 + 渐慢节奏", "style": "lo-fi"},
    "angry": {"bpm": 90, "energy": "medium", "texture": "电子节拍 + 降速处理", "style": "electronic"},
    "sad": {"bpm": 65, "energy": "low", "texture": "钢琴独奏 + 雨声背景", "style": "classical"},
    "neutral": {"bpm": 85, "energy": "medium", "texture": "温暖和弦 + 轻柔节拍", "style": "chill"},
}


def recommend_music_params(mood_type: str, intensity: int = 5) -> dict:
    """
    根据情绪类型和强度生成音乐推荐

    Returns:
        dict: { mood, title, artist, bpm, energy, texture, scene, url, ... }
    """
    return get_companion_music_recommendation(mood_type, intensity)


# ==================== 会话消息保存 ====================

def save_agent_reply(
    conversation_id: int,
    user_id: int,
    content: str,
    mood_type: str = "neutral",
) -> bool:
    """
    保存 Agent 生成的回复到消息表

    Returns:
        bool: 是否成功
    """
    try:
        with SessionLocal(engine) as session:
            msg = CompanionMessage(
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                content=content,
                mood_type=mood_type,
            )
            session.add(msg)
            session.commit()
            logger.info("save_agent_reply: conversation=%d, length=%d", conversation_id, len(content))
            return True
    except Exception as e:
        logger.error("save_agent_reply error: %s", str(e)[:200])
        return False
