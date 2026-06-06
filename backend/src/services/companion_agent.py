"""
灵音伙伴 LangGraph Agent 编排层

使用 LangGraph StateGraph 构建情绪陪伴型 Agent 工作流：
START → load_profile → load_mood → load_memories → classify_emotion
       → generate_reply → recommend_music → extract_memories → save_memories → END

核心设计：
- 8 个节点，线性工作流（无分支）
- 每个节点更新 AgentState，下游节点可读取上游结果
- SSE 友好：Agent 执行完毕后统一返回结果，由 API 层做流式输出
- 降级策略：LangGraph 不可用时自动退回简单顺序执行
"""

import json
import asyncio
import logging
from typing import TypedDict, Optional, List, Annotated
from datetime import datetime

logger = logging.getLogger("moodwave.companion_agent")

# ==================== 尝试导入 LangGraph ====================

LANGGRAPH_AVAILABLE = False
try:
    from langgraph.graph import StateGraph, END, START
    LANGGRAPH_AVAILABLE = True
    logger.info("LangGraph imported successfully")
except ImportError:
    logger.warning("LangGraph not available, using fallback sequential execution")


# ==================== Agent State 定义 ====================

class AgentState(TypedDict, total=False):
    """Agent 工作流状态"""
    # 输入
    user_id: int
    user_message: str
    mood_type: str
    intensity: int
    tags: List[str]
    conversation_id: Optional[int]
    history: List[dict]
    avatar_character: str
    mbti: str
    zodiac: str

    # 中间状态（节点输出）
    user_profile: dict
    today_mood: Optional[dict]
    recent_moods: List[dict]
    relevant_memories: List[dict]
    emotion_analysis: dict
    reply: str
    music_recommendation: dict
    memory_candidates: List[dict]
    saved_memory_ids: List[int]

    # 输出
    agent_status: str
    nodes_executed: List[str]
    status_messages: List[str]
    final_result: dict


# ==================== Agent 工具函数导入 ====================

from src.services.companion_tools import (
    get_user_profile,
    get_today_mood,
    get_recent_moods,
    get_companion_memories,
    classify_emotion_by_rules,
    recommend_music_params,
    save_companion_memories_batch,
)


# ==================== Agent 节点函数 ====================

async def node_load_profile(state: AgentState) -> dict:
    """节点 1：加载用户画像"""
    user_id = state["user_id"]
    profile = get_user_profile(user_id)

    return {
        "user_profile": profile,
        "avatar_character": profile.get("avatar_character", "cat"),
        "mbti": profile.get("mbti", ""),
        "zodiac": profile.get("zodiac", ""),
        "agent_status": "loading_profile",
        "nodes_executed": state.get("nodes_executed", []) + ["load_profile"],
        "status_messages": state.get("status_messages", []) + ["📖 正在加载你的信息..."],
    }


async def node_load_mood(state: AgentState) -> dict:
    """节点 2：加载当天情绪 + 近期记录"""
    user_id = state["user_id"]
    today_mood = get_today_mood(user_id)
    recent_moods = get_recent_moods(user_id, limit=10)

    # 如果前端传了情绪信息，以前端为准；否则用数据库的
    mood_type = state.get("mood_type", "neutral")
    intensity = state.get("intensity", 5)
    if today_mood and not state.get("mood_type"):
        mood_type = today_mood["mood_type"]
        intensity = today_mood["intensity"]

    return {
        "today_mood": today_mood,
        "recent_moods": recent_moods,
        "mood_type": mood_type,
        "intensity": intensity,
        "agent_status": "loading_mood",
        "nodes_executed": state.get("nodes_executed", []) + ["load_mood"],
        "status_messages": state.get("status_messages", []) + ["🧠 正在理解你的情绪..."],
    }


async def node_load_memories(state: AgentState) -> dict:
    """节点 3：检索相关长期记忆"""
    user_id = state["user_id"]
    character = state.get("avatar_character", "cat")
    memories = get_companion_memories(user_id, character, limit=10)

    return {
        "relevant_memories": memories,
        "agent_status": "loading_memories",
        "nodes_executed": state.get("nodes_executed", []) + ["load_memories"],
        "status_messages": state.get("status_messages", []) + ["📚 正在回想最近的记录..."],
    }


async def node_classify_emotion(state: AgentState) -> dict:
    """节点 4：情绪分类（规则引擎 + AI 增强）"""
    text = state.get("user_message", "")
    mood_type = state.get("mood_type", "neutral")
    intensity = state.get("intensity", 5)
    tags = state.get("tags", [])

    # 规则引擎分类
    classification = classify_emotion_by_rules(text, mood_type, intensity, tags)

    return {
        "emotion_analysis": classification,
        "mood_type": classification["mood_type"],
        "intensity": classification["intensity"],
        "agent_status": "classifying",
        "nodes_executed": state.get("nodes_executed", []) + ["classify_emotion"],
        "status_messages": state.get("status_messages", []) + ["🔍 正在分析情绪状态..."],
    }


async def node_generate_reply(state: AgentState) -> dict:
    """节点 5：生成共情回复（调用 DeepSeek）"""
    from src.services.ai_service import _build_system_prompt_chat, _get_client, MODEL, _mood_label

    client = _get_client()
    character = state.get("avatar_character", "cat")
    mbti = state.get("mbti", "")
    zodiac = state.get("zodiac", "")
    mood_type = state.get("mood_type", "neutral")
    intensity = state.get("intensity", 5)
    user_message = state.get("user_message", "")
    tags = state.get("tags", [])
    history = state.get("history", [])
    memories = state.get("relevant_memories", [])

    # 构建 system prompt
    system_prompt = _build_system_prompt_chat(character, mbti, zodiac)

    # 注入记忆上下文
    if memories:
        memory_texts = [f"- {m['content']}" for m in memories[:5]]
        memory_context = "\n".join(memory_texts)
        system_prompt += f"\n\n你记住的关于 TA 的事情：\n{memory_context}\n\n请在回复中自然地引用这些记忆（不要直接说'我记得你...'），让 TA 感受到被关心。"

    # 构建上下文消息
    context_parts = [f"【当前情绪】{_mood_label(mood_type)}（强度 {intensity}/10）"]
    if tags:
        context_parts.append(f"【情绪标签】{', '.join(tags)}")
    if user_message.strip():
        context_parts.append(f"【用户说】{user_message}")

    # 今天情绪记录上下文
    today_mood = state.get("today_mood")
    if today_mood and today_mood.get("note"):
        context_parts.append(f"【今天记录】{_mood_label(today_mood['mood_type'])}，{today_mood['note'][:80]}")

    context_text = "\n".join(context_parts)

    # 构建消息列表
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-6:])
    messages.append({"role": "user", "content": context_text})

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=False,
                max_tokens=300,
                temperature=0.8,
                extra_body={"thinking": {"type": "disabled"}},
            ),
            timeout=15.0,
        )
        reply = response.choices[0].message.content.strip()
        if not reply:
            reply = "我在这里陪你，想说什么都可以告诉我。"

    except asyncio.TimeoutError:
        logger.warning("node_generate_reply timeout, trying simplified call")
        reply = await _try_simplified_reply(client, state)
    except Exception as e:
        logger.error("node_generate_reply error: %s, trying simplified call", str(e)[:200])
        reply = await _try_simplified_reply(client, state)

    return {
        "reply": reply,
        "agent_status": "generating_reply",
        "nodes_executed": state.get("nodes_executed", []) + ["generate_reply"],
        "status_messages": state.get("status_messages", []) + ["💬 正在生成疗愈建议..."],
    }


async def _try_simplified_reply(client, state: dict) -> str:
    """降级方案：用更简单的 prompt + 更长超时重试一次"""
    from src.services.ai_service import _mood_label, _build_character_prompt, MODEL

    character = state.get("avatar_character", "cat")
    mood_type = state.get("mood_type", "neutral")
    user_message = state.get("user_message", "")
    character_prompt = _build_character_prompt(character)

    system_prompt = f"""你是 MoodWave 灵音的 AI 情绪伙伴。
{character_prompt}
风格：温暖、有同理心，像一个关心你的朋友。不说教、不评判。语言简洁自然。
当前用户情绪：{_mood_label(mood_type)}"""

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message or "你好"},
                ],
                stream=False,
                max_tokens=200,
                temperature=0.85,
                extra_body={"thinking": {"type": "disabled"}},
            ),
            timeout=20.0,
        )
        reply = response.choices[0].message.content
        if reply and reply.strip():
            return reply.strip()
    except Exception as e:
        logger.error("_try_simplified_reply also failed: %s", str(e)[:200])

    # 最终兜底
    character_names = {"cat": "喵呜", "fox": "绒绒", "planet": "星诺", "sunny": "晴晴",
                       "astronaut": "航航", "moon": "月遥", "sakura": "樱樱"}
    name = character_names.get(character, "小灵音")
    mood_labels = {"happy": "开心", "calm": "平静", "anxious": "焦虑", "angry": "生气",
                   "sad": "难过", "neutral": "平静"}
    mood_cn = mood_labels.get(mood_type, "平静")
    return f"我是{name}，感觉到你现在的状态是{mood_cn}的。我在认真听你说，你可以多告诉我一些，或者我为你推荐一首适合现在的音乐？"


async def node_recommend_music(state: AgentState) -> dict:
    """节点 6：推荐疗愈音乐参数"""
    mood_type = state.get("mood_type", "neutral")
    intensity = state.get("intensity", 5)
    music_params = recommend_music_params(mood_type, intensity)

    return {
        "music_recommendation": music_params,
        "agent_status": "recommending_music",
        "nodes_executed": state.get("nodes_executed", []) + ["recommend_music"],
        "status_messages": state.get("status_messages", []) + ["🎵 正在匹配疗愈音乐..."],
    }


async def node_extract_memories(state: AgentState) -> dict:
    """节点 7：从对话中提取记忆候选"""
    user_message = state.get("user_message", "")
    reply = state.get("reply", "")
    mood_type = state.get("mood_type", "neutral")
    tags = state.get("tags", [])

    candidates = []

    # 规则提取：用户消息中的关键信息
    if len(user_message) > 10:
        # 长消息可能包含重要信息
        candidates.append({
            "content": f"TA 说：「{user_message[:50]}」",
            "memory_type": "event",
            "mood_context": mood_type,
            "tags": tags,
        })

    # 情绪模式提取
    recent_moods = state.get("recent_moods", [])
    if len(recent_moods) >= 3:
        mood_counts = {}
        for m in recent_moods:
            mt = m.get("mood_type", "neutral")
            mood_counts[mt] = mood_counts.get(mt, 0) + 1
        dominant = max(mood_counts, key=mood_counts.get)
        if mood_counts[dominant] >= 3:
            candidates.append({
                "content": f"最近 TA 经常感到{dominant}",
                "memory_type": "habit",
                "mood_context": dominant,
                "tags": ["pattern"],
            })

    # 标签高频提取
    all_tags = []
    for m in recent_moods:
        all_tags.extend(m.get("tags", []))
    if all_tags:
        from collections import Counter
        top_tag, count = Counter(all_tags).most_common(1)[0]
        if count >= 3:
            candidates.append({
                "content": f"TA 经常记录和「{top_tag}」相关的情绪",
                "memory_type": "habit",
                "mood_context": None,
                "tags": [top_tag],
            })

    # 限制候选数量
    candidates = candidates[:3]

    return {
        "memory_candidates": candidates,
        "agent_status": "extracting_memories",
        "nodes_executed": state.get("nodes_executed", []) + ["extract_memories"],
        "status_messages": state.get("status_messages", []) + ["📝 正在更新伙伴记忆..."],
    }


async def node_save_memories(state: AgentState) -> dict:
    """节点 8：保存记忆到数据库"""
    user_id = state["user_id"]
    candidates = state.get("memory_candidates", [])

    saved_ids = []
    if candidates:
        saved_ids = save_companion_memories_batch(user_id, candidates, source="ai")

    return {
        "saved_memory_ids": saved_ids,
        "agent_status": "completed",
        "nodes_executed": state.get("nodes_executed", []) + ["save_memories"],
        "status_messages": state.get("status_messages", []),
    }


# ==================== LangGraph 工作流构建 ====================

def _build_agent_graph():
    """
    构建 LangGraph StateGraph

    工作流：
    START → load_profile → load_mood → load_memories → classify_emotion
           → generate_reply → recommend_music → extract_memories → save_memories → END
    """
    graph = StateGraph(AgentState)

    # 添加节点
    graph.add_node("load_profile", node_load_profile)
    graph.add_node("load_mood", node_load_mood)
    graph.add_node("load_memories", node_load_memories)
    graph.add_node("classify_emotion", node_classify_emotion)
    graph.add_node("generate_reply", node_generate_reply)
    graph.add_node("recommend_music", node_recommend_music)
    graph.add_node("extract_memories", node_extract_memories)
    graph.add_node("save_memories", node_save_memories)

    # 线性边
    graph.add_edge(START, "load_profile")
    graph.add_edge("load_profile", "load_mood")
    graph.add_edge("load_mood", "load_memories")
    graph.add_edge("load_memories", "classify_emotion")
    graph.add_edge("classify_emotion", "generate_reply")
    graph.add_edge("generate_reply", "recommend_music")
    graph.add_edge("recommend_music", "extract_memories")
    graph.add_edge("extract_memories", "save_memories")
    graph.add_edge("save_memories", END)

    return graph.compile()


# 编译图（模块加载时执行一次）
_compiled_graph = None
if LANGGRAPH_AVAILABLE:
    try:
        _compiled_graph = _build_agent_graph()
        logger.info("LangGraph agent graph compiled successfully")
    except Exception as e:
        logger.error("Failed to compile LangGraph graph: %s", str(e)[:200])
        _compiled_graph = None


# ==================== Fallback 顺序执行 ====================

async def _fallback_sequential(state: AgentState) -> AgentState:
    """
    LangGraph 不可用时的降级方案：按顺序执行所有节点
    """
    result = dict(state)
    result["nodes_executed"] = []
    result["status_messages"] = []

    nodes = [
        ("load_profile", node_load_profile),
        ("load_mood", node_load_mood),
        ("load_memories", node_load_memories),
        ("classify_emotion", node_classify_emotion),
        ("generate_reply", node_generate_reply),
        ("recommend_music", node_recommend_music),
        ("extract_memories", node_extract_memories),
        ("save_memories", node_save_memories),
    ]

    for name, node_fn in nodes:
        try:
            updates = await node_fn(result)
            result.update(updates)
        except Exception as e:
            logger.error("fallback node %s error: %s", name, str(e)[:200])

    return result


# ==================== 公共接口 ====================

async def run_companion_agent(
    user_id: int,
    user_message: str = "",
    mood_type: str = "neutral",
    intensity: int = 5,
    tags: List[str] = None,
    conversation_id: Optional[int] = None,
    history: List[dict] = None,
    avatar_character: str = "cat",
    mbti: str = "",
    zodiac: str = "",
) -> dict:
    """
    运行灵音伙伴 Agent 工作流

    这是唯一的公共入口。无论 LangGraph 是否可用，都返回相同的结构化结果。

    Args:
        user_id: 用户 ID
        user_message: 用户输入的文字
        mood_type: 前端传入的情绪类型（可被 Agent 覆盖）
        intensity: 情绪强度
        tags: 情绪标签
        conversation_id: 会话 ID
        history: 历史对话
        avatar_character: 角色形象
        mbti: 用户 MBTI
        zodiac: 用户星座

    Returns:
        dict: {
            reply: str,
            mood_type: str,
            intensity: int,
            music_recommendation: dict,
            memory_refs: list,
            agent_status: str,
            nodes_executed: list,
            status_messages: list,
        }
    """
    # 初始状态
    initial_state: AgentState = {
        "user_id": user_id,
        "user_message": user_message,
        "mood_type": mood_type,
        "intensity": intensity,
        "tags": tags or [],
        "conversation_id": conversation_id,
        "history": history or [],
        "avatar_character": avatar_character,
        "mbti": mbti,
        "zodiac": zodiac,
        "nodes_executed": [],
        "status_messages": [],
        "relevant_memories": [],
        "today_mood": None,
        "recent_moods": [],
        "emotion_analysis": {},
        "reply": "",
        "music_recommendation": {},
        "memory_candidates": [],
        "saved_memory_ids": [],
    }

    # 选择执行方式
    if _compiled_graph is not None:
        logger.info("Running with LangGraph StateGraph")
        try:
            final_state = await _compiled_graph.ainvoke(initial_state)
        except Exception as e:
            logger.error("LangGraph execution failed, falling back: %s", str(e)[:200])
            final_state = await _fallback_sequential(initial_state)
    else:
        logger.info("Running with fallback sequential execution")
        final_state = await _fallback_sequential(initial_state)

    # 构建统一返回格式
    return {
        "reply": final_state.get("reply", ""),
        "mood_type": final_state.get("mood_type", mood_type),
        "intensity": final_state.get("intensity", intensity),
        "music_recommendation": final_state.get("music_recommendation", {}),
        "memory_refs": final_state.get("saved_memory_ids", []),
        "agent_status": final_state.get("agent_status", "completed"),
        "nodes_executed": final_state.get("nodes_executed", []),
        "status_messages": final_state.get("status_messages", []),
        "emotion_analysis": final_state.get("emotion_analysis", {}),
    }


# ==================== 工具函数导出（供其他模块调用） ====================

__all__ = [
    "run_companion_agent",
    "LANGGRAPH_AVAILABLE",
    "AgentState",
]
