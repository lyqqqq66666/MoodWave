"""
AI 服务层 - DeepSeek API 调用封装

负责：
1. 流式情绪对话 (SSE)
2. 情绪分析（返回结构化结果）
"""

import os
import json
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# ==================== 客户端初始化 ====================

def _get_client() -> AsyncOpenAI:
    """获取 DeepSeek AsyncOpenAI 客户端"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY 未配置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")

# ==================== Prompt 模板 ====================

SYSTEM_PROMPT_CHAT = """你是 MoodWave 灵音的 AI 情绪伙伴，名字叫「灵灵」。

你的风格：
- 温暖、有同理心，像一个关心你的朋友
- 不说教、不评判，先理解再建议
- 语言简洁，不超过 150 字/次
- 适当使用 emoji 增加亲切感

你的任务：
- 根据用户当前情绪（mood_type + intensity）给出个性化回应
- 先共情用户的感受
- 再给出 1-2 个简单可行的情绪调节建议
- 最后推荐用音乐治愈（呼应 MoodWave 产品特色）

重要：用中文回答，语气自然亲切。"""


SYSTEM_PROMPT_ANALYZE = """你是一个情绪分析专家，负责分析用户的情绪状态并返回结构化结果。

请严格按照以下 JSON 格式返回，不要输出任何额外文字：
{
  "summary": "一句话描述用户当前情绪状态（20字以内）",
  "insight": "深层情绪洞察，帮助用户理解自己的感受（50字以内）",
  "suggestion": "具体可行的情绪调节建议（50字以内）",
  "music_mood": "推荐的音乐情绪类型（只能是：happy/calm/anxious/angry/sad/neutral 之一）",
  "energy_level": "能量水平（只能是：high/medium/low 之一）"
}"""


# ==================== 核心服务函数 ====================

async def stream_chat(
    mood_type: str,
    intensity: int,
    user_message: str,
    tags: list[str] | None = None,
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    流式情绪对话 (SSE)

    Args:
        mood_type: 当前情绪类型 (happy/calm/anxious/angry/sad/neutral)
        intensity: 情绪强度 (1-10)
        user_message: 用户输入的文字
        tags: 情绪标签列表
        history: 历史对话记录 [{"role": "user/assistant", "content": "..."}]

    Yields:
        str: SSE 格式的文本块，格式为 "data: {json}\n\n"
    """
    client = _get_client()

    # 构建上下文消息
    context_parts = [
        f"【当前情绪】{_mood_label(mood_type)}（强度 {intensity}/10）",
    ]
    if tags:
        context_parts.append(f"【情绪标签】{', '.join(tags)}")
    if user_message.strip():
        context_parts.append(f"【用户说】{user_message}")

    context_text = "\n".join(context_parts)

    # 构建消息列表
    messages = [{"role": "system", "content": SYSTEM_PROMPT_CHAT}]
    if history:
        messages.extend(history[-6:])  # 最多保留最近 3 轮对话
    messages.append({"role": "user", "content": context_text})

    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            stream=True,
            max_tokens=300,
            temperature=0.8,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                payload = json.dumps({"type": "text", "content": delta.content}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

        # 流式结束标记
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        error_payload = json.dumps({"type": "error", "content": str(e)}, ensure_ascii=False)
        yield f"data: {error_payload}\n\n"


async def analyze_mood_with_ai(
    mood_type: str,
    intensity: int,
    note: str = "",
    tags: list[str] | None = None,
) -> dict:
    """
    用 AI 分析情绪，返回结构化结果

    Args:
        mood_type: 情绪类型
        intensity: 强度 1-10
        note: 用户文字描述
        tags: 情绪标签

    Returns:
        dict: {summary, insight, suggestion, music_mood, energy_level}
    """
    client = _get_client()

    user_content_parts = [
        f"情绪类型：{_mood_label(mood_type)}",
        f"情绪强度：{intensity}/10",
    ]
    if tags:
        user_content_parts.append(f"标签：{', '.join(tags)}")
    if note.strip():
        user_content_parts.append(f"描述：{note}")

    user_content = "\n".join(user_content_parts)

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_ANALYZE},
                {"role": "user", "content": user_content},
            ],
            stream=False,
            max_tokens=300,
            temperature=0.3,  # 结构化输出用低温度，更稳定
        )

        raw = response.choices[0].message.content.strip()

        # 尝试解析 JSON
        # 去掉可能的 markdown 代码块包裹
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError:
        # 解析失败时降级到规则模板
        return _fallback_analysis(mood_type, intensity)
    except Exception as e:
        return _fallback_analysis(mood_type, intensity)


# ==================== 辅助函数 ====================

def _mood_label(mood_type: str) -> str:
    """情绪类型中文标签"""
    labels = {
        "happy": "开心 😊",
        "calm": "平静 😌",
        "anxious": "焦虑 😰",
        "angry": "愤怒 😤",
        "sad": "悲伤 😢",
        "neutral": "平淡 😐",
    }
    return labels.get(mood_type, mood_type)


def _fallback_analysis(mood_type: str, intensity: int) -> dict:
    """AI 调用失败时的降级模板"""
    templates = {
        "happy": {
            "summary": "你今天心情很好！",
            "insight": "积极的情绪能提升创造力和社交连接，好好珍惜这种状态。",
            "suggestion": "记录下让你开心的瞬间，建立专属的快乐能量库。",
            "music_mood": "happy",
            "energy_level": "high",
        },
        "calm": {
            "summary": "你今天比较平静。",
            "insight": "平静是一种宝贵的内在资源，说明你的情绪调节能力不错。",
            "suggestion": "可以尝试冥想或深呼吸，让这种平静感持续更久。",
            "music_mood": "calm",
            "energy_level": "medium",
        },
        "anxious": {
            "summary": "你今天有些焦虑，这很正常。",
            "insight": "焦虑往往来自对未来的不确定感，聚焦当下能帮助缓解。",
            "suggestion": "试试 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，呼气 8 秒。",
            "music_mood": "calm",
            "energy_level": "high",
        },
        "angry": {
            "summary": "你今天情绪有些激动。",
            "insight": "愤怒是正当的情绪，关键在于找到健康的出口释放它。",
            "suggestion": "先离开触发点，做 5 分钟快走或运动，再处理问题。",
            "music_mood": "calm",
            "energy_level": "high",
        },
        "sad": {
            "summary": "你今天有些低落，没关系的。",
            "insight": "悲伤是心灵在处理和消化某些重要的事情，允许自己感受它。",
            "suggestion": "找一个信任的人倾诉，或者给自己一首喜欢的歌。",
            "music_mood": "sad",
            "energy_level": "low",
        },
        "neutral": {
            "summary": "你今天情绪比较平稳。",
            "insight": "平稳的情绪是很好的基础，适合做需要专注的事情。",
            "suggestion": "试试一件小事让今天更有意义，比如记录一个感恩瞬间。",
            "music_mood": "calm",
            "energy_level": "medium",
        },
    }

    result = templates.get(mood_type, templates["neutral"]).copy()
    if intensity >= 8:
        result["suggestion"] += " 由于情绪强度较高，优先照顾自己的感受。"
    return result
