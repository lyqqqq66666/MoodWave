"""
音乐推荐 API 路由

提供基于情绪的音乐推荐 + 收藏功能
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import Optional, List

from src.core.models import FavoriteMusic, FavoriteMusicRequest, User
from src.db.database import get_session
from src.api.auth import get_current_user

router = APIRouter()

# 音乐推荐映射表
# 在实际应用中，这可以从数据库或外部 API 获取
MUSIC_RECOMMENDATIONS = {
    "happy": [
        {
            "id": "happy_1",
            "title": "Good as Hell",
            "artist": "Lizzo",
            "mood_type": "happy",
            "url": "https://example.com/music/happy_1.mp3",
            "duration": 180,
        },
        {
            "id": "happy_2",
            "title": "Walking on Sunshine",
            "artist": "Katrina & The Waves",
            "mood_type": "happy",
            "url": "https://example.com/music/happy_2.mp3",
            "duration": 210,
        },
    ],
    "sad": [
        {
            "id": "sad_1",
            "title": "Someone Like You",
            "artist": "Adele",
            "mood_type": "sad",
            "url": "https://example.com/music/sad_1.mp3",
            "duration": 240,
        },
        {
            "id": "sad_2",
            "title": "The Night We Met",
            "artist": "Lord Huron",
            "mood_type": "sad",
            "url": "https://example.com/music/sad_2.mp3",
            "duration": 200,
        },
    ],
    "calm": [
        {
            "id": "calm_1",
            "title": "Weightless",
            "artist": "Marconi Union",
            "mood_type": "calm",
            "url": "https://example.com/music/calm_1.mp3",
            "duration": 480,
        },
        {
            "id": "calm_2",
            "title": "Clair de Lune",
            "artist": "Claude Debussy",
            "mood_type": "calm",
            "url": "https://example.com/music/calm_2.mp3",
            "duration": 300,
        },
    ],
    "anxious": [
        {
            "id": "anxious_1",
            "title": "Breathe",
            "artist": "Pink Floyd",
            "mood_type": "anxious",
            "url": "https://example.com/music/anxious_1.mp3",
            "duration": 300,
        },
        {
            "id": "anxious_2",
            "title": "Meditation",
            "artist": "Enya",
            "mood_type": "anxious",
            "url": "https://example.com/music/anxious_2.mp3",
            "duration": 240,
        },
    ],
    "angry": [
        {
            "id": "angry_1",
            "title": "Break Stuff",
            "artist": "Limp Bizkit",
            "mood_type": "angry",
            "url": "https://example.com/music/angry_1.mp3",
            "duration": 180,
        },
        {
            "id": "angry_2",
            "title": "Killing in the Name",
            "artist": "Rage Against the Machine",
            "mood_type": "angry",
            "url": "https://example.com/music/angry_2.mp3",
            "duration": 210,
        },
    ],
    "neutral": [
        {
            "id": "neutral_1",
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "mood_type": "neutral",
            "url": "https://example.com/music/neutral_1.mp3",
            "duration": 200,
        },
        {
            "id": "neutral_2",
            "title": "Levitating",
            "artist": "Dua Lipa",
            "mood_type": "neutral",
            "url": "https://example.com/music/neutral_2.mp3",
            "duration": 203,
        },
    ],
}


@router.get("/music/recommend")
async def recommend_music(
    mood_type: Optional[str] = Query(None, description="情绪类型（mood_type 或 mood 均可）"),
    mood: Optional[str] = Query(None, description="情绪类型别名，与 mood_type 等价"),
    limit: int = Query(5, ge=1, le=20, description="返回的推荐数量"),
):
    """
    获取音乐推荐

    支持两种参数名（兼容前端两种写法）：
    - GET /api/music/recommend?mood_type=happy
    - GET /api/music/recommend?mood=happy

    Returns:
        统一格式: { "code": 0, "msg": "ok", "data": [...] }
    """
    # 兼容两个参数名
    query_mood = mood_type or mood

    if query_mood and query_mood in MUSIC_RECOMMENDATIONS:
        recommendations = MUSIC_RECOMMENDATIONS[query_mood]
    else:
        # 没有指定或不认识的情绪类型 → 返回全部
        recommendations = []
        for mood_list in MUSIC_RECOMMENDATIONS.values():
            recommendations.extend(mood_list)

    return {
        "code": 0,
        "msg": "ok",
        "data": recommendations[:limit],
    }


@router.get("/music/moods")
async def get_available_moods():
    """
    获取可用的情绪类型

    Returns:
        dict: 统一格式 { "code": 0, "msg": "ok", "data": { "moods": [...] } }
    """
    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "moods": list(MUSIC_RECOMMENDATIONS.keys()),
            "description": "系统支持的情绪类型",
        },
    }


# ==================== 音乐收藏 ====================

@router.post("/music/favorite")
async def toggle_favorite(
    data: FavoriteMusicRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    收藏/取消收藏音乐

    如果已收藏 → 取消收藏（删除）
    如果未收藏 → 添加收藏

    Returns:
        { code, msg, data: { action: "added"|"removed" } }
    """
    # 检查是否已收藏
    existing = session.exec(
        select(FavoriteMusic).where(
            FavoriteMusic.user_id == current_user.id,
            FavoriteMusic.music_id == data.music_id,
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        return {
            "code": 0,
            "msg": "ok",
            "data": {"action": "removed", "music_id": data.music_id},
        }

    fav = FavoriteMusic(
        user_id=current_user.id,
        music_id=data.music_id,
        title=data.title,
        artist=data.artist,
        mood_type=data.mood_type,
    )
    session.add(fav)
    session.commit()
    session.refresh(fav)

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "action": "added",
            "id": fav.id,
            "music_id": fav.music_id,
            "title": fav.title,
            "artist": fav.artist,
        },
    }


@router.get("/music/favorites")
async def get_favorites(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取用户的音乐收藏列表

    Returns:
        { code, msg, data: [{id, music_id, title, artist, mood_type, created_at}] }
    """
    favs = session.exec(
        select(FavoriteMusic)
        .where(FavoriteMusic.user_id == current_user.id)
        .order_by(FavoriteMusic.created_at.desc())
    ).all()

    return {
        "code": 0,
        "msg": "ok",
        "data": [
            {
                "id": f.id,
                "music_id": f.music_id,
                "title": f.title,
                "artist": f.artist,
                "mood_type": f.mood_type,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in favs
        ],
    }
