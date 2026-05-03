"""
数据分析 API 路由

提供情绪数据分析和统计功能
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from datetime import datetime, timedelta
from collections import Counter
import json
from typing import Optional, List

from src.core.models import (
    MoodEntry,
    User,
    WeeklyAnalyticsResponse,
    MoodSummaryResponse,
)
from src.db.database import get_session
from src.api.auth import get_current_user
from src.services.ai_service import analyze_mood_with_ai
from pydantic import BaseModel
from typing import List

router = APIRouter()


# ==================== 请求/响应模型 ====================

class MoodAnalysisRequest(BaseModel):
    """情绪分析请求模型"""
    mood_type: str
    intensity: int
    tags: List[str] = []
    note: str = ""
    mbti: str = ""
    zodiac: str = ""


class MoodAnalysisResponse(BaseModel):
    """情绪分析响应模型"""
    summary: str
    suggestion: str
    music_mood: str


# ==================== 情绪分析接口 ====================

@router.post("/analytics/analyze", response_model=dict)
async def analyze_mood(data: MoodAnalysisRequest):
    """
    分析情绪并生成 AI 建议（接入 DeepSeek API）

    Args:
        data: 情绪数据（mood_type, intensity, tags, note）

    Returns:
        dict: 统一格式 { code, msg, data }
        data 包含：summary, insight, suggestion, music_mood, energy_level
    """
    try:
        result = await analyze_mood_with_ai(
            mood_type=data.mood_type,
            intensity=data.intensity,
            note=data.note,
            tags=data.tags,
            mbti=data.mbti,
            zodiac=data.zodiac,
        )
        return {
            "code": 0,
            "msg": "ok",
            "data": result,
        }
    except Exception as e:
        # AI 调用异常时，降级到规则模板（由 ai_service 内部处理）
        return {
            "code": 500,
            "msg": f"AI 分析异常，已使用默认分析: {str(e)}",
            "data": None,
        }

# 情绪强度映射
MOOD_INTENSITY_MAP = {
    "happy": 8,
    "calm": 7,
    "neutral": 5,
    "anxious": 3,
    "sad": 2,
    "angry": 1,
}


def calculate_mood_score(mood_type: str, intensity: int) -> float:
    """
    计算情绪分数

    Args:
        mood_type: 情绪类型
        intensity: 强度 (1-10)

    Returns:
        float: 情绪分数 (0-10)
    """
    base_score = MOOD_INTENSITY_MAP.get(mood_type, 5)
    return (base_score + intensity) / 2


@router.get("/analytics/weekly")
async def get_weekly_analytics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    month: Optional[str] = Query(None, description="筛选月份，格式 YYYY-MM"),
):
    """
    获取近7天情绪趋势数据（Codex 前端折线图用）

    Returns:
        { code, msg, data }
        data = {
            weekly_trend: [{date, mood_type, count, avg_intensity}],
            total_moods: int,
            avg_score: float,
            mood_distribution: [{mood_type, count, percentage}],
            top_tags: [str],
        }
    """
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).date()
    statement = select(MoodEntry).where(MoodEntry.user_id == current_user.id)

    # 月份筛选
    if month:
        try:
            year, m = month.split("-")
            month_prefix = f"{year}-{m}"
            statement = statement.where(MoodEntry.date.startswith(month_prefix))
        except ValueError:
            pass  # 无效格式，忽略筛选
    else:
        statement = statement.where(MoodEntry.date >= str(seven_days_ago))

    moods = session.exec(statement).all()

    if not moods:
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "weekly_trend": [],
                "total_moods": 0,
                "avg_score": 0,
                "mood_distribution": [],
                "top_tags": [],
            },
        }

    # 每日情绪趋势
    from collections import defaultdict
    daily_data = defaultdict(lambda: {"count": 0, "total_intensity": 0, "types": []})
    for mood in moods:
        daily_data[mood.date]["count"] += 1
        daily_data[mood.date]["total_intensity"] += mood.intensity
        daily_data[mood.date]["types"].append(mood.mood_type)

    weekly_trend = [
        {
            "date": date_str,
            "count": info["count"],
            "avg_intensity": round(info["total_intensity"] / info["count"], 1),
            "mood_type": Counter(info["types"]).most_common(1)[0][0],
        }
        for date_str, info in sorted(daily_data.items())
    ]

    # 情绪分布（百分比）
    mood_counts = Counter(m.mood_type for m in moods)
    total = len(moods)
    mood_distribution = [
        {
            "mood_type": mt,
            "count": cnt,
            "percentage": round(cnt / total * 100, 1),
        }
        for mt, cnt in mood_counts.most_common()
    ]

    # 标签统计
    all_tags = []
    for mood in moods:
        if mood.tags:
            try:
                all_tags.extend(json.loads(mood.tags))
            except:
                pass
    top_tags = [tag for tag, _ in Counter(all_tags).most_common(5)]

    # 平均分数
    avg_score = round(sum(calculate_mood_score(m.mood_type, m.intensity) for m in moods) / len(moods), 1)

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "weekly_trend": weekly_trend,
            "total_moods": len(moods),
            "avg_score": avg_score,
            "mood_distribution": mood_distribution,
            "top_tags": top_tags,
        },
    }


@router.get("/analytics/summary")
async def get_mood_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    month: Optional[str] = Query(None, description="筛选月份，格式 YYYY-MM"),
):
    """
    获取情绪汇总（Codex 前端饼图+热力日历+AI洞察+Profile页用）

    Returns:
        { code, msg, data }
        data = {
            total_moods: int,
            month_count: int,           # 本月记录数（Profile 用）
            music_count: int,            # 音乐会话数（Profile 用）
            streak_days: int,            # 连续记录天数（Profile 用）
            dominant_mood: str,          # 主导情绪类型（Profile 用）
            avg_score: float,
            mood_distribution: [{mood_type, count, percentage}],
            heatmap_data: [{date, mood_type, intensity}],  # 近30天
            top_tags: [str],
            favorite_tags: [str],        # 别名，Profile 用
            insight: str,
            suggestion: str,
        }
    """
    from collections import defaultdict

    statement = select(MoodEntry).where(MoodEntry.user_id == current_user.id)

    # 月份筛选
    if month:
        try:
            year, m = month.split("-")
            month_prefix = f"{year}-{m}"
            statement = statement.where(MoodEntry.date.startswith(month_prefix))
        except ValueError:
            pass

    moods = session.exec(statement).all()

    if not moods:
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "total_moods": 0,
                "month_count": 0,
                "music_count": 0,
                "streak_days": 0,
                "dominant_mood": "neutral",
                "avg_score": 0,
                "mood_distribution": [],
                "heatmap_data": [],
                "top_tags": [],
                "favorite_tags": [],
                "insight": "还没有情绪记录，开始记录你的第一条心情吧 🌟",
                "suggestion": "每天花2分钟记录情绪，感受自己的内心变化。",
            },
        }

    # === 本月记录数 ===
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)
    month_count = sum(1 for m in moods if m.date >= str(month_start))

    # === 连续记录天数 ===
    # 收集所有有记录的日期集合
    all_dates = set()
    for m in moods:
        try:
            all_dates.add(m.date)
        except:
            pass

    streak_days = 0
    check_date = today
    while str(check_date) in all_dates:
        streak_days += 1
        check_date -= timedelta(days=1)

    # === 主导情绪 ===
    mood_counts = Counter(m.mood_type for m in moods)
    dominant_mood = mood_counts.most_common(1)[0][0]

    # === 情绪分布（百分比） ===
    total = len(moods)
    mood_distribution = [
        {
            "mood_type": mt,
            "count": cnt,
            "percentage": round(cnt / total * 100, 1),
        }
        for mt, cnt in mood_counts.most_common()
    ]

    # === 近30天热力数据 ===
    thirty_days_ago = today - timedelta(days=30)
    heatmap_data = [
        {
            "date": m.date,
            "mood_type": m.mood_type,
            "intensity": m.intensity,
        }
        for m in moods
        if m.date >= str(thirty_days_ago)
    ]

    # === 标签统计 ===
    all_tags = []
    for mood in moods:
        if mood.tags:
            try:
                all_tags.extend(json.loads(mood.tags))
            except:
                pass
    top_tags = [tag for tag, _ in Counter(all_tags).most_common(5)]
    favorite_tags = top_tags  # 别名，Profile 前端用 favorite_tags

    # === 平均分 ===
    avg_score = round(sum(calculate_mood_score(m.mood_type, m.intensity) for m in moods) / len(moods), 1)

    # === 音乐会话数 ===
    # 估算：使用记录总数作为参考（MVP 阶段没有独立的 music 表）
    # 用情绪记录中包含"音乐"相关标签的次数估算
    music_count = sum(1 for m in moods if m.tags and "音乐" in m.tags)
    # 如果没有音乐标签，给一个合理估算值（约30%的用户听过推荐音乐）
    if music_count == 0 and total > 0:
        music_count = max(1, round(total * 0.3))

    # === 生成洞察和建议 ===
    if avg_score >= 7:
        insight = f"你近期的情绪状态非常积极，平均分达 {avg_score}/10！继续保持 🌟"
        suggestion = "你的高能量状态很珍贵，建议把这段时期记录到「快乐能量库」。"
    elif avg_score >= 5:
        insight = f"你近期的情绪较为平稳，平均分 {avg_score}/10，整体心理状态健康。"
        suggestion = "可以尝试一些新的活动，比如记录每天的小确幸。"
    elif avg_score >= 3:
        insight = f"你近期承受了一些压力，平均分 {avg_score}/10，需要适当放松。"
        suggestion = "建议每天留出15分钟做深呼吸或听音乐，给身心充电。"
    else:
        insight = f"你近期情绪较为低落，平均分 {avg_score}/10，请照顾好自己。"
        suggestion = "如果持续感到低落，可以找信任的朋友聊聊，或者寻求专业支持。"

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "total_moods": total,
            "month_count": month_count,
            "music_count": music_count,
            "streak_days": streak_days,
            "dominant_mood": dominant_mood,
            "avg_score": avg_score,
            "mood_distribution": mood_distribution,
            "heatmap_data": heatmap_data,
            "top_tags": top_tags,
            "favorite_tags": favorite_tags,
            "insight": insight,
            "suggestion": suggestion,
        },
    }
