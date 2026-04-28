"""
AI 对话 API 路由

提供：
- POST /api/ai/chat  情绪对话（SSE 流式响应）
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from src.services.ai_service import stream_chat

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
