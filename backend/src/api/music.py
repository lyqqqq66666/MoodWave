"""
音乐推荐 API 路由

提供基于情绪的音乐推荐功能
"""

from fastapi import APIRouter, Query
from typing import Optional, List

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
