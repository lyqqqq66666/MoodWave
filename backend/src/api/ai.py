"""
AI 对话 API 路由

提供：
- POST /api/ai/chat          情绪对话（SSE 流式响应）
- POST /api/ai/analyze-mood  多模态情绪分析（图片+语音+文字）
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List

from src.services.ai_service import stream_chat, analyze_mood_multi_modal

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
        )
        return JSONResponse({
            "code": 0,
            "msg": "ok",
            "data": result,
        })
    except Exception as e:
        return JSONResponse({
            "code": 500,
            "msg": f"AI 分析异常: {str(e)}",
            "data": None,
        }, status_code=200)
