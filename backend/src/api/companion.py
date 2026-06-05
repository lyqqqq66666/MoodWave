"""
灵音伙伴 API 路由

提供：
- POST /api/companion/conversations              新建会话
- GET  /api/companion/conversations              会话列表
- GET  /api/companion/conversations/{id}/messages 消息历史
- POST /api/companion/conversations/{id}/messages 发送消息（流式返回+自动保存）
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session, select
from datetime import datetime

import asyncio
import json
import logging

from src.core.models import (
    User, CompanionConversation, CompanionMessage, CompanionMemory,
    CompanionMemoryCreate, CompanionMemoryUpdate, CompanionMemoryResponse,
    MoodEntry
)
from src.db.database import get_session
from src.api.auth import get_current_user
from src.services.ai_service import stream_chat, generate_companion_memories
from src.services.companion_agent import run_companion_agent

logger = logging.getLogger("moodwave.companion_api")

router = APIRouter()


# ==================== 请求/响应模型 ====================

class ConversationCreate(BaseModel):
    """新建会话请求"""
    title: Optional[str] = None  # 可选标题，不传则自动生成
    character: str = "cat"  # 伙伴形象 id


class ConversationUpdate(BaseModel):
    """更新会话请求"""
    title: str  # 1-40 字，不允许为空


class ConversationResponse(BaseModel):
    """会话响应"""
    id: int
    title: str
    character: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0  # 消息数量

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """消息响应"""
    id: int
    conversation_id: int
    role: str
    content: str
    mood_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    """发送消息请求"""
    content: str
    mood_type: str = "neutral"
    intensity: int = 5
    tags: Optional[List[str]] = None
    avatar_character: str = "cat"
    mbti: str = ""
    zodiac: str = ""


# ==================== 会话接口 ====================

@router.post("/companion/conversations")
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    新建灵音伙伴会话

    Returns:
        { code, msg, data }
        data = { id, title, character, created_at }
    """
    try:
        # 自动生成标题
        if not request.title:
            # 获取当天情绪记录作为标题参考
            from datetime import date
            today = date.today()
            statement = (
                select(MoodEntry)
                .where(MoodEntry.user_id == current_user.id)
                .where(MoodEntry.created_at >= str(today))
                .order_by(MoodEntry.created_at.desc())
                .limit(1)
            )
            today_mood = session.exec(statement).first()

            mood_labels = {
                "happy": "开心", "calm": "平静", "anxious": "焦虑",
                "angry": "愤怒", "sad": "悲伤", "neutral": "平淡",
            }

            if today_mood:
                mood_label = mood_labels.get(today_mood.mood_type, "平淡")
                request.title = f"关于「{mood_label}」的对话"
            else:
                request.title = f"新对话 {datetime.now().strftime('%m-%d %H:%M')}"

        # 创建会话
        conversation = CompanionConversation(
            user_id=current_user.id,
            title=request.title,
            character=request.character,
        )
        session.add(conversation)
        session.commit()
        session.refresh(conversation)

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "id": conversation.id,
                "title": conversation.title,
                "character": conversation.character,
                "created_at": conversation.created_at.isoformat(),
            },
        }

    except Exception as e:
        logger.error("create_conversation error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"创建会话失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.get("/companion/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    获取会话列表

    Returns:
        { code, msg, data }
        data = [{ id, title, character, created_at, updated_at, message_count }]
    """
    try:
        statement = (
            select(CompanionConversation)
            .where(CompanionConversation.user_id == current_user.id)
            .order_by(CompanionConversation.updated_at.desc())
        )
        conversations = session.exec(statement).all()

        # 获取每个会话的消息数量
        result = []
        for conv in conversations:
            msg_count = session.exec(
                select(CompanionMessage)
                .where(CompanionMessage.conversation_id == conv.id)
            ).all()
            result.append({
                "id": conv.id,
                "title": conv.title,
                "character": conv.character,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": len(msg_count),
            })

        return {
            "code": 0,
            "msg": "ok",
            "data": result,
        }

    except Exception as e:
        logger.error("list_conversations error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"获取会话列表失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.get("/companion/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    获取会话消息历史

    Returns:
        { code, msg, data }
        data = [{ id, conversation_id, role, content, mood_type, created_at }]
    """
    try:
        # 验证会话属于当前用户
        statement = select(CompanionConversation).where(
            CompanionConversation.id == conversation_id,
            CompanionConversation.user_id == current_user.id,
        )
        conversation = session.exec(statement).first()

        if not conversation:
            return JSONResponse({
                "code": 404,
                "msg": "会话不存在",
                "data": None,
            }, status_code=200)

        # 获取消息（按时间正序）
        statement = (
            select(CompanionMessage)
            .where(CompanionMessage.conversation_id == conversation_id)
            .order_by(CompanionMessage.created_at.asc())
        )
        messages = session.exec(statement).all()

        result = []
        for msg in messages:
            result.append({
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "role": msg.role,
                "content": msg.content,
                "mood_type": msg.mood_type,
                "created_at": msg.created_at.isoformat(),
            })

        return {
            "code": 0,
            "msg": "ok",
            "data": result,
        }

    except Exception as e:
        logger.error("get_conversation_messages error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"获取消息失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.post("/companion/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    发送消息（流式返回 + 自动保存）

    前端通过 EventSource 或 fetch + ReadableStream 接收。

    SSE 数据格式：
    - 文本块: data: {"type": "text", "content": "..."}\n\n
    - 结束:   data: {"type": "done"}\n\n
    - 错误:   data: {"type": "error", "content": "..."}\n\n
    """
    try:
        # 验证会话属于当前用户
        statement = select(CompanionConversation).where(
            CompanionConversation.id == conversation_id,
            CompanionConversation.user_id == current_user.id,
        )
        conversation = session.exec(statement).first()

        if not conversation:
            return JSONResponse({
                "code": 404,
                "msg": "会话不存在",
                "data": None,
            }, status_code=200)

        # 保存用户消息
        user_message = CompanionMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            role="user",
            content=request.content,
            mood_type=request.mood_type,
        )
        session.add(user_message)

        # 更新会话时间和标题
        conversation.updated_at = datetime.utcnow()
        if not conversation.title or conversation.title.startswith("新对话"):
            # 用用户第一条消息作为标题
            conversation.title = request.content[:20] + ("..." if len(request.content) > 20 else "")

        session.commit()
        session.refresh(user_message)

        # 获取历史消息（最近 12 条 = 6 轮，控制上下文窗口）
        history_statement = (
            select(CompanionMessage)
            .where(CompanionMessage.conversation_id == conversation_id)
            .order_by(CompanionMessage.created_at.desc())
            .limit(12)
        )
        history_messages = session.exec(history_statement).all()
        history_messages = list(reversed(history_messages))  # 按时间正序

        # 转换为 AI 对话格式
        history_dicts = [{"role": m.role, "content": m.content} for m in history_messages]

        # 调用 AI 生成回复（流式）
        full_reply = []

        async def event_generator():
            async for chunk in stream_chat(
                mood_type=request.mood_type,
                intensity=request.intensity,
                user_message=request.content,
                tags=request.tags,
                history=history_dicts,
                avatar_character=request.avatar_character,
                mbti=request.mbti,
                zodiac=request.zodiac,
            ):
                yield chunk
                # 收集完整回复用于保存
                if '"type": "text"' in chunk:
                    try:
                        data = chunk.replace("data: ", "").strip()
                        if data:
                            obj = json.loads(data)
                            if obj.get("type") == "text":
                                full_reply.append(obj.get("content", ""))
                    except:
                        pass

            # 流式结束后，异步保存 AI 回复
            async def save_ai_reply():
                try:
                    ai_content = "".join(full_reply)
                    if ai_content:
                        # 创建新的数据库会话
                        from src.db.database import engine, SessionLocal
                        with SessionLocal(engine) as save_session:
                            ai_message = CompanionMessage(
                                conversation_id=conversation_id,
                                user_id=current_user.id,
                                role="assistant",
                                content=ai_content,
                                mood_type=request.mood_type,
                            )
                            save_session.add(ai_message)

                            # 更新会话时间
                            conv = save_session.get(CompanionConversation, conversation_id)
                            if conv:
                                conv.updated_at = datetime.utcnow()

                            save_session.commit()
                            logger.info("AI reply saved: conversation_id=%d, length=%d",
                                       conversation_id, len(ai_content))
                except Exception as e:
                    logger.error("save_ai_reply error: %s", str(e)[:200])

            # 在流式结束后保存
            await save_ai_reply()

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error("send_message error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"发送消息失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.post("/companion/conversations/{conversation_id}/messages-agent")
async def send_message_agent(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Agent 模式发送消息（LangGraph 编排 + 流式返回 + 自动保存）

    与普通 send_message 的区别：
    1. 经过完整 Agent 工作流（8 个节点）
    2. 自动检索长期记忆并注入上下文
    3. 自动提取对话记忆并保存
    4. 返回音乐推荐参数
    5. SSE 中包含 agent_status 状态更新

    SSE 数据格式：
    - 状态:  data: {"type": "status", "content": "..."}\n\n
    - 文本:  data: {"type": "text", "content": "..."}\n\n
    - 音乐:  data: {"type": "music", "content": {...}}\n\n
    - 结束:  data: {"type": "done", "content": {...}}\n\n
    - 错误:  data: {"type": "error", "content": "..."}\n\n
    """
    try:
        # 验证会话属于当前用户
        statement = select(CompanionConversation).where(
            CompanionConversation.id == conversation_id,
            CompanionConversation.user_id == current_user.id,
        )
        conversation = session.exec(statement).first()

        if not conversation:
            return JSONResponse({
                "code": 404,
                "msg": "会话不存在",
                "data": None,
            }, status_code=200)

        # 保存用户消息
        user_message = CompanionMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            role="user",
            content=request.content,
            mood_type=request.mood_type,
        )
        session.add(user_message)

        # 更新会话时间和标题
        conversation.updated_at = datetime.utcnow()
        if not conversation.title or conversation.title.startswith("新对话"):
            conversation.title = request.content[:20] + ("..." if len(request.content) > 20 else "")

        session.commit()
        session.refresh(user_message)

        # 获取历史消息
        history_statement = (
            select(CompanionMessage)
            .where(CompanionMessage.conversation_id == conversation_id)
            .order_by(CompanionMessage.created_at.desc())
            .limit(12)
        )
        history_messages = session.exec(history_statement).all()
        history_messages = list(reversed(history_messages))
        history_dicts = [{"role": m.role, "content": m.content} for m in history_messages]

        # 收集完整回复用于保存
        full_reply = []

        async def event_generator():
            try:
                # 运行 Agent 工作流
                agent_result = await run_companion_agent(
                    user_id=current_user.id,
                    user_message=request.content,
                    mood_type=request.mood_type,
                    intensity=request.intensity,
                    tags=request.tags or [],
                    conversation_id=conversation_id,
                    history=history_dicts,
                    avatar_character=request.avatar_character,
                    mbti=request.mbti,
                    zodiac=request.zodiac,
                )

                # 发送状态消息
                for status_msg in agent_result.get("status_messages", []):
                    status_payload = json.dumps({"type": "status", "content": status_msg}, ensure_ascii=False)
                    yield f"data: {status_payload}\n\n"

                # 流式输出回复（逐字）
                reply_text = agent_result.get("reply", "")
                for char in reply_text:
                    text_payload = json.dumps({"type": "text", "content": char}, ensure_ascii=False)
                    yield f"data: {text_payload}\n\n"
                    full_reply.append(char)
                    await asyncio.sleep(0.02)

                # 发送音乐推荐
                music_rec = agent_result.get("music_recommendation", {})
                if music_rec:
                    music_payload = json.dumps({"type": "music", "content": music_rec}, ensure_ascii=False)
                    yield f"data: {music_payload}\n\n"

                # 先保存 AI 回复到数据库，获取消息 ID 和时间
                ai_msg_id = None
                ai_msg_created_at = None
                ai_content = "".join(full_reply)
                if ai_content:
                    try:
                        from src.db.database import engine, SessionLocal
                        with SessionLocal(engine) as save_session:
                            ai_msg = CompanionMessage(
                                conversation_id=conversation_id,
                                user_id=current_user.id,
                                role="assistant",
                                content=ai_content,
                                mood_type=request.mood_type,
                            )
                            save_session.add(ai_msg)
                            conv = save_session.get(CompanionConversation, conversation_id)
                            if conv:
                                conv.updated_at = datetime.utcnow()
                            save_session.commit()
                            save_session.refresh(ai_msg)
                            ai_msg_id = ai_msg.id
                            ai_msg_created_at = ai_msg.created_at.isoformat()
                            logger.info("Agent reply saved: conversation_id=%d, length=%d",
                                       conversation_id, len(ai_content))
                    except Exception as e:
                        logger.error("save_ai_reply error: %s", str(e)[:200])

                # 发送完成事件（包含消息 ID 和时间）
                done_payload = json.dumps({
                    "type": "done",
                    "content": {
                        "reply": reply_text,
                        "mood_type": agent_result.get("mood_type", request.mood_type),
                        "music_recommendation": music_rec,
                        "memory_refs": agent_result.get("memory_refs", []),
                        "agent_status": agent_result.get("agent_status", "completed"),
                        "nodes_executed": agent_result.get("nodes_executed", []),
                        "assistant_message_id": ai_msg_id,
                        "assistant_created_at": ai_msg_created_at,
                    },
                }, ensure_ascii=False)
                yield f"data: {done_payload}\n\n"

            except Exception as e:
                logger.error("send_message_agent error: %s", str(e)[:200])
                error_payload = json.dumps({"type": "error", "content": "Agent 执行异常"}, ensure_ascii=False)
                yield f"data: {error_payload}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error("send_message_agent error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"Agent 消息发送失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.delete("/companion/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    删除会话及其所有消息
    """
    try:
        # 验证会话属于当前用户
        statement = select(CompanionConversation).where(
            CompanionConversation.id == conversation_id,
            CompanionConversation.user_id == current_user.id,
        )
        conversation = session.exec(statement).first()

        if not conversation:
            return JSONResponse({
                "code": 404,
                "msg": "会话不存在",
                "data": None,
            }, status_code=200)

        # 删除所有消息
        messages = session.exec(
            select(CompanionMessage)
            .where(CompanionMessage.conversation_id == conversation_id)
        ).all()
        for msg in messages:
            session.delete(msg)

        # 删除会话
        session.delete(conversation)
        session.commit()

        return {
            "code": 0,
            "msg": "ok",
            "data": None,
        }

    except Exception as e:
        logger.error("delete_conversation error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"删除会话失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.patch("/companion/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: int,
    request: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    修改会话标题

    Returns:
        { code, msg, data }
        data = { id, title, updated_at }
    """
    try:
        # 验证会话属于当前用户
        statement = select(CompanionConversation).where(
            CompanionConversation.id == conversation_id,
            CompanionConversation.user_id == current_user.id,
        )
        conversation = session.exec(statement).first()

        if not conversation:
            return JSONResponse({
                "code": 404,
                "msg": "会话不存在",
                "data": None,
            }, status_code=200)

        # 校验标题长度
        title = request.title.strip()
        if len(title) < 1 or len(title) > 40:
            return JSONResponse({
                "code": 400,
                "msg": "标题长度需要 1-40 个字符",
                "data": None,
            }, status_code=200)

        conversation.title = title
        conversation.updated_at = datetime.utcnow()
        session.add(conversation)
        session.commit()

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "id": conversation.id,
                "title": conversation.title,
                "updated_at": conversation.updated_at.isoformat(),
            },
        }

    except Exception as e:
        logger.error("update_conversation error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"更新会话失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


# ==================== 灵音伙伴记忆接口 ====================

@router.get("/companion/memories")
async def list_memories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    memory_type: Optional[str] = None,
    limit: int = 50,
):
    """
    获取灵音伙伴记忆列表

    可选参数：
    - memory_type: 按记忆类型筛选 (personality / preference / habit / event)
    - limit: 返回数量上限（默认 50）
    """
    try:
        statement = select(CompanionMemory).where(
            CompanionMemory.user_id == current_user.id
        )
        if memory_type:
            statement = statement.where(CompanionMemory.memory_type == memory_type)

        statement = statement.order_by(CompanionMemory.created_at.desc()).limit(limit)
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
                "source": mem.source,
                "memory_type": mem.memory_type,
                "mood_context": mem.mood_context,
                "tags": tags,
                "created_at": mem.created_at.isoformat(),
                "updated_at": mem.updated_at.isoformat(),
            })

        return {
            "code": 0,
            "msg": "ok",
            "data": result,
        }

    except Exception as e:
        logger.error("list_memories error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"获取记忆失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.post("/companion/memories")
async def create_memory(
    request: CompanionMemoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    手动创建灵音伙伴记忆
    """
    try:
        tags_json = json.dumps(request.tags) if request.tags else "[]"
        memory = CompanionMemory(
            user_id=current_user.id,
            content=request.content,
            source=request.source,
            memory_type=request.memory_type,
            mood_context=request.mood_context,
            tags=tags_json,
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "id": memory.id,
                "content": memory.content,
                "source": memory.source,
                "memory_type": memory.memory_type,
                "mood_context": memory.mood_context,
                "tags": request.tags,
                "created_at": memory.created_at.isoformat(),
                "updated_at": memory.updated_at.isoformat(),
            },
        }

    except Exception as e:
        logger.error("create_memory error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"创建记忆失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.put("/companion/memories/{memory_id}")
async def update_memory(
    memory_id: int,
    request: CompanionMemoryUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    更新灵音伙伴记忆
    """
    try:
        statement = select(CompanionMemory).where(
            CompanionMemory.id == memory_id,
            CompanionMemory.user_id == current_user.id,
        )
        memory = session.exec(statement).first()

        if not memory:
            return JSONResponse({
                "code": 404,
                "msg": "记忆不存在",
                "data": None,
            }, status_code=200)

        # 更新字段
        if request.content is not None:
            memory.content = request.content
        if request.source is not None:
            memory.source = request.source
        if request.memory_type is not None:
            memory.memory_type = request.memory_type
        if request.mood_context is not None:
            memory.mood_context = request.mood_context
        if request.tags is not None:
            memory.tags = json.dumps(request.tags)

        memory.updated_at = datetime.utcnow()
        session.add(memory)
        session.commit()

        tags = json.loads(memory.tags) if memory.tags else []
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "id": memory.id,
                "content": memory.content,
                "source": memory.source,
                "memory_type": memory.memory_type,
                "mood_context": memory.mood_context,
                "tags": tags,
                "created_at": memory.created_at.isoformat(),
                "updated_at": memory.updated_at.isoformat(),
            },
        }

    except Exception as e:
        logger.error("update_memory error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"更新记忆失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.delete("/companion/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    删除灵音伙伴记忆
    """
    try:
        statement = select(CompanionMemory).where(
            CompanionMemory.id == memory_id,
            CompanionMemory.user_id == current_user.id,
        )
        memory = session.exec(statement).first()

        if not memory:
            return JSONResponse({
                "code": 404,
                "msg": "记忆不存在",
                "data": None,
            }, status_code=200)

        session.delete(memory)
        session.commit()

        return {
            "code": 0,
            "msg": "ok",
            "data": None,
        }

    except Exception as e:
        logger.error("delete_memory error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"删除记忆失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


@router.post("/companion/memories/generate")
async def generate_memories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    触发 AI 生成灵音伙伴记忆

    基于用户情绪历史，AI 自动生成个性化记忆并存入数据库。
    """
    try:
        # 获取用户情绪历史（最近 30 条）
        statement = (
            select(MoodEntry)
            .where(MoodEntry.user_id == current_user.id)
            .order_by(MoodEntry.created_at.desc())
            .limit(30)
        )
        moods = session.exec(statement).all()

        if len(moods) < 3:
            return JSONResponse({
                "code": 400,
                "msg": "情绪记录不足 3 条，无法生成记忆",
                "data": None,
            }, status_code=200)

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

        # 调用 AI 生成记忆
        ai_memories = await generate_companion_memories(
            mood_entries=mood_entries,
            avatar_character=current_user.avatar_character or "cat",
            mbti=current_user.mbti or "",
            zodiac=current_user.zodiac or "",
        )

        if not ai_memories:
            return JSONResponse({
                "code": 0,
                "msg": "AI 未能生成有效记忆",
                "data": {"count": 0, "memories": []},
            }, status_code=200)

        # 保存生成的记忆到数据库
        saved_memories = []
        for mem in ai_memories:
            memory = CompanionMemory(
                user_id=current_user.id,
                content=mem["content"],
                source="ai",
                memory_type=mem.get("memory_type", "personality"),
                mood_context=mem.get("mood_context"),
                tags=json.dumps(mem.get("tags", [])),
            )
            session.add(memory)
            saved_memories.append(mem["content"])

        session.commit()

        logger.info("generate_memories success user=%d count=%d", current_user.id, len(saved_memories))
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "count": len(saved_memories),
                "memories": saved_memories,
            },
        }

    except Exception as e:
        logger.error("generate_memories error: %s", str(e)[:200])
        return JSONResponse({
            "code": 500,
            "msg": f"生成记忆失败: {str(e)[:100]}",
            "data": None,
        }, status_code=200)


# ==================== 角色配置端点 ====================

@router.get("/companion/characters")
async def list_characters():
    """
    获取灵音伙伴角色列表（P2 资产层）

    返回完整角色配置（name / species / sceneTitle / orbitPills / expressions 等），
    供前端首页、登录页、伙伴页共用同一套悬浮宠物语言。

    不需要登录即可访问。

    Returns:
        { code, msg, data: [{id, name, species, ...}, ...] }
    """
    from src.services.ai_service import CHARACTER_PERSONAS

    chars = []
    seen = set()
    for cid, persona in CHARACTER_PERSONAS.items():
        if cid == "star" or cid in seen:
            continue  # "star" 是旧兼容 ID，跳过
        seen.add(cid)
        chars.append({
            "id": cid,
            "name": persona["name"],
            "species": persona.get("species", ""),
            "style": persona["style"],
            "sceneTitle": persona.get("sceneTitle", ""),
            "orbitPills": persona.get("orbitPills", []),
            "expressions": persona.get("expressions", []),
        })

    return {
        "code": 0,
        "msg": "ok",
        "data": chars,
    }
