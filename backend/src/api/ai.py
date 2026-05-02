"""
AI 对话 API 路由

提供：
- POST /api/ai/chat          情绪对话（SSE 流式响应）
- POST /api/ai/analyze-mood  多模态情绪分析（图片+语音+文字）
- GET  /api/companion/memories  灵音伙伴记忆
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session, select

import asyncio
import logging

from src.services.ai_service import stream_chat, analyze_mood_multi_modal, generate_companion_memories
from src.core.models import User, MoodEntry
from src.db.database import get_session
from src.api.auth import get_current_user

logger = logging.getLogger("moodwave.ai_api")

router = APIRouter()


# ==================== 请求/响应模型 ====================

class ChatMessage(BaseModel):
    """历史消息模型"""
    role: str  # "user" | "assistant"
    content: str


class AIChatRequest(BaseModel):
    """AI 对话请求模型"""
    mood_type: str = "neutral"           # 当前情绪类型
    intensity: int = 5                   # 情绪强度 1-10
    message: str = ""                    # 用户输入的文字
    tags: Optional[List[str]] = None     # 情绪标签
    history: Optional[List[ChatMessage]] = None  # 历史对话
    avatar_character: str = "cat"        # 角色形象
    mbti: str = ""                       # 用户 MBTI
    zodiac: str = ""                     # 用户星座


# ==================== AI 对话接口 ====================

@router.post("/ai/chat")
async def ai_chat(request: AIChatRequest):
    """
    AI 情绪对话（SSE 流式响应）

    前端通过 EventSource 或 fetch + ReadableStream 接收。

    SSE 数据格式：
    - 文本块: data: {"type": "text", "content": "..."}\n\n
    - 结束:   data: {"type": "done"}\n\n
    - 错误:   data: {"type": "error", "content": "..."}\n\n

    请求体：
    ```json
    {
      "mood_type": "anxious",
      "intensity": 7,
      "message": "最近期末压力好大，睡不好",
      "tags": ["study"],
      "history": []
    }
    ```
    """
    # 转换 history 格式
    history_dicts = None
    if request.history:
        history_dicts = [{"role": m.role, "content": m.content} for m in request.history]

    async def event_generator():
        async for chunk in stream_chat(
            mood_type=request.mood_type,
            intensity=request.intensity,
            user_message=request.message,
            tags=request.tags,
            history=history_dicts,
            avatar_character=request.avatar_character,
            mbti=request.mbti,
            zodiac=request.zodiac,
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲，确保流式实时传输
            "Connection": "keep-alive",
        },
    )


# ==================== 多模态情绪分析模型 ====================

class AnalyzeMoodRequest(BaseModel):
    """多模态情绪分析请求"""
    mood_type: str = "neutral"
    intensity: int = 5
    note: str = ""
    tags: Optional[List[str]] = None
    image_analysis: Optional[str] = None   # qwen3-vl-plus 图片分析结果
    voice_text: Optional[str] = None       # qwen3-asr-flash 语音转写结果
    history_moods: Optional[List[dict]] = None  # 近期情绪历史
    mbti: str = ""                         # 用户 MBTI
    zodiac: str = ""                       # 用户星座


@router.post("/ai/analyze-mood")
async def analyze_mood_endpoint(request: AnalyzeMoodRequest):
    """
    多模态情绪分析（综合文字+图片+语音）

    请求体：
    ```json
    {
      "mood_type": "anxious",
      "intensity": 7,
      "note": "今天有点焦虑",
      "tags": ["study", "work"],
      "image_analysis": "{\"description\":\"书桌上堆满资料\"}",
      "voice_text": "我好累啊今天",
      "history_moods": [{"date":"2026-04-30","mood_type":"happy","intensity":8}]
    }
    ```

    Returns:
        { code, msg, data }
        data = {
            summary, insight, suggestion,
            music_recommendation: {mood, bpm, title, texture},
            radar_data: [{mood, score}]
        }
    """
    try:
        result = await analyze_mood_multi_modal(
            mood_type=request.mood_type,
            intensity=request.intensity,
            note=request.note,
            tags=request.tags,
            image_analysis=request.image_analysis or "",
            voice_text=request.voice_text or "",
            history_moods=request.history_moods,
            mbti=request.mbti,
            zodiac=request.zodiac,
        )
        # 如果返回的是 fallback 结果（没有 radar_data 的 summary 字段来自 fallback 模板），标记为 fallback
        is_fallback = result.get("summary", "").startswith("你今天")
        return JSONResponse({
            "code": 0,
            "msg": "ok" if not is_fallback else "AI 暂不可用，已使用本地分析模板",
            "data": result,
            "fallback": is_fallback,
        })
    except asyncio.TimeoutError:
        logger.warning("analyze_mood_endpoint timeout mood=%s", request.mood_type)
        return JSONResponse({
            "code": 500,
            "msg": "AI 服务响应超时，请稍后重试",
            "data": None,
        }, status_code=200)
    except Exception as e:
        logger.error("analyze_mood_endpoint error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"AI 服务异常，请稍后重试",
            "data": None,
        }, status_code=200)


# ==================== 灵音伙伴记忆 ====================

@router.get("/companion/memories")
async def get_companion_memories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    获取灵音伙伴记住的关于用户的关键信息

    优先使用 AI 语义记忆生成，失败时降级到规则引擎。
    """
    import json

    statement = (
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id)
        .order_by(MoodEntry.created_at.desc())
        .limit(30)
    )
    moods = session.exec(statement).all()

    if not moods:
        return {"code": 0, "msg": "ok", "data": {"memories": [], "source": "empty"}}

    # 构建情绪记录摘要供 AI 使用
    mood_entries = []
    for m in moods:
        tags = []
        if m.tags:
            try:
                tags = json.loads(m.tags) if isinstance(m.tags, str) else m.tags
            except (json.JSONDecodeError, TypeError):
                pass

        mood_entries.append({
            "mood_type": m.mood_type,
            "intensity": m.intensity or 5,
            "tags": tags,
            "note": (m.note or "")[:50],
            "date": str(m.created_at.date()) if m.created_at else "",
        })

    # 尝试 AI 语义记忆生成
    memories = []
    source = "rules"

    try:
        ai_memories = await generate_companion_memories(
            mood_entries=mood_entries,
            avatar_character=current_user.avatar_character or "cat",
            mbti=current_user.mbti or "",
            zodiac=current_user.zodiac or "",
        )
        if ai_memories:
            memories = ai_memories
            source = "ai"
            logger.info("companion_memories AI generated count=%d user=%s", len(memories), current_user.id)
    except Exception as e:
        logger.warning("companion_memories AI fallback to rules: %s", str(e)[:100])

    # 规则引擎 fallback
    if not memories:
        mood_counts = {}
        for m in moods:
            mood_counts[m.mood_type] = mood_counts.get(m.mood_type, 0) + 1

        total = len(moods)
        dominant = max(mood_counts, key=mood_counts.get)
        mood_labels = {
            "happy": "开心", "calm": "平静", "anxious": "焦虑",
            "angry": "愤怒", "sad": "悲伤", "neutral": "平淡",
        }

        memories.append(f"最近 {total} 天里，你最多的情绪是{mood_labels.get(dominant, dominant)}")

        all_tags = []
        for m in moods:
            if m.tags:
                try:
                    all_tags.extend(json.loads(m.tags))
                except (json.JSONDecodeError, TypeError):
                    pass

        if all_tags:
            from collections import Counter
            tag_counter = Counter(all_tags)
            top_tag, _ = tag_counter.most_common(1)[0]
            tag_labels = {"study": "学习", "work": "工作", "social": "社交",
                          "emotion": "情感", "health": "身体", "life": "生活"}
            tag_label = tag_labels.get(top_tag, top_tag)
            memories.append(f"你经常记录和「{tag_label}」相关的情绪")

        intensities = [m.intensity for m in moods if m.intensity]
        if intensities:
            avg_intensity = sum(intensities) / len(intensities)
            if avg_intensity >= 7:
                memories.append("你的情绪强度整体偏高，是个感情丰富的人")
            elif avg_intensity <= 4:
                memories.append("你的情绪比较温和内敛")

        for m in moods:
            if m.note and m.note.strip():
                memories.append(f"你上一次写道：「{m.note[:30]}{'...' if len(m.note) > 30 else ''}」")
                break

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "memories": memories,
            "source": source,
            "character": current_user.avatar_character,
            "mbti": current_user.mbti,
            "zodiac": current_user.zodiac,
        },
    }
