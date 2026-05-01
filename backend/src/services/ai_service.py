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


# ==================== 多模态 AI 服务（Qwen）====================

def _get_dashscope_client() -> AsyncOpenAI:
    """获取阿里云百炼 DashScope 客户端（Qwen 模型）"""
    api_key = os.getenv("DASHSCOPE_API_KEY")
    base_url = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    if not api_key:
        raise ValueError("DASHSCOPE_API_KEY 未配置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


QWEN_VL_MODEL = os.getenv("QWEN_VL_MODEL", "qwen3-vl-plus")
QWEN_ASR_MODEL = os.getenv("QWEN_ASR_MODEL", "qwen3-asr-flash")


async def analyze_images(images_base64: list[str]) -> dict:
    """
    使用 qwen3-vl-plus 分析图片内容

    Args:
        images_base64: 图片的 base64 列表

    Returns:
        dict: { description: str, mood_hint: str, objects: [str] }
    """
    client = _get_dashscope_client()

    try:
        # 构建多模态消息
        content_parts = []
        for img_b64 in images_base64[:3]:  # 最多3张
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
            })

        content_parts.append({
            "type": "text",
            "text": "请描述这些图片的内容、场景氛围，并推断可能反映的情绪状态。返回JSON格式：{\"description\":\"图片描述\",\"mood_hint\":\"情绪推断\",\"objects\":[\"关键物体\"]}"
        })

        response = await client.chat.completions.create(
            model=QWEN_VL_MODEL,
            messages=[{"role": "user", "content": content_parts}],
            max_tokens=500,
            temperature=0.3,
        )

        raw = response.choices[0].message.content.strip()
        # 尝试解析 JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        import json
        return json.loads(raw)

    except json.JSONDecodeError:
        return {"description": raw[:200], "mood_hint": "未知", "objects": []}
    except Exception as e:
        return {"description": "", "mood_hint": "", "objects": [], "error": str(e)}


async def transcribe_voice(audio_file_path: str) -> dict:
    """
    使用 qwen3-asr-flash 将语音转文字

    qwen3-asr-flash 通过 chat/completions 端点调用（OpenAI 兼容），
    音频以 base64 data URI 传入 input_audio 类型。

    Args:
        audio_file_path: 音频文件的本地路径

    Returns:
        dict: { text: str, language: str, emotion: str }
    """
    import base64
    import pathlib

    client = _get_dashscope_client()

    try:
        # 读取音频文件并编码为 base64 data URI
        file_path = pathlib.Path(audio_file_path)
        audio_bytes = file_path.read_bytes()

        # 推断 MIME 类型
        suffix = file_path.suffix.lower()
        mime_map = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".ogg": "audio/ogg",
            ".webm": "audio/webm",
        }
        mime_type = mime_map.get(suffix, "audio/wav")

        base64_str = base64.b64encode(audio_bytes).decode()
        data_uri = f"data:{mime_type};base64,{base64_str}"

        # 通过 chat/completions 调用（不是 audio.transcriptions）
        response = await client.chat.completions.create(
            model=QWEN_ASR_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {"data": data_uri}
                    }
                ]
            }],
            stream=False,
            extra_body={
                "asr_options": {
                    "language": "zh",
                    "enable_itn": False,  # 不开启逆文本标准化
                }
            }
        )

        content = response.choices[0].message.content
        annotations = getattr(response.choices[0].message, "annotations", [])
        audio_info = annotations[0] if annotations else {}

        return {
            "text": content,
            "language": audio_info.get("language", "zh"),
            "emotion": audio_info.get("emotion", "neutral"),
        }

    except Exception as e:
        return {"text": "", "language": "zh", "emotion": "neutral", "error": str(e)}


async def analyze_mood_multi_modal(
    mood_type: str,
    intensity: int,
    note: str = "",
    tags: list[str] | None = None,
    image_analysis: str = "",
    voice_text: str = "",
    history_moods: list[dict] | None = None,
) -> dict:
    """
    综合多模态输入，生成完整情绪分析报告

    使用 DeepSeek V4 综合文字 + 图片分析 + 语音转写 + 历史数据

    Returns:
        dict: {
            summary, insight, suggestion,
            music_recommendation: {mood, bpm, title, texture},
            radar_data: [{mood, score}]
        }
    """
    client = _get_client()  # DeepSeek 客户端

    parts = [
        f"情绪类型：{_mood_label(mood_type)}",
        f"情绪强度：{intensity}/10",
    ]
    if tags:
        parts.append(f"标签：{', '.join(tags)}")
    if note.strip():
        parts.append(f"文字描述：{note}")
    if image_analysis:
        parts.append(f"图片分析：{image_analysis}")
    if voice_text:
        parts.append(f"语音转写：{voice_text}")
    if history_moods:
        recent = history_moods[-5:]  # 最近5条
        history_text = "; ".join(
            f"{m.get('date','')} {_mood_label(m.get('mood_type',''))} {m.get('intensity',0)}分"
            for m in recent
        )
        parts.append(f"近期情绪历史：{history_text}")

    user_content = "\n".join(parts)

    prompt = """你是 MoodWave 灵音的情绪分析专家。

请根据用户的多模态输入（情绪类型、强度、文字、图片描述、语音转写、历史），生成一份完整的情绪分析报告。

严格按以下 JSON 格式返回，不要输出额外文字：
{
  "summary": "用户情绪状态一句话总结（30字以内）",
  "insight": "深层情绪洞察，结合历史数据给出趋势分析（80字以内）",
  "suggestion": "具体可行的情绪调节建议（50字以内）",
  "music_recommendation": {
    "mood": "推荐音乐情绪类型（happy/calm/anxious/angry/sad/neutral）",
    "bpm": 70,
    "title": "推荐曲风名称",
    "texture": "音乐质感描述（如：柔和钢琴+雨声）"
  },
  "radar_data": [
    {"mood": "开心", "score": 60},
    {"mood": "平静", "score": 70},
    {"mood": "焦虑", "score": 30},
    {"mood": "愤怒", "score": 10},
    {"mood": "悲伤", "score": 20},
    {"mood": "平淡", "score": 50}
  ]
}

注意：radar_data 中的 score 为 0-100 的整数，综合所有输入合理估算。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content},
            ],
            stream=False,
            max_tokens=600,
            temperature=0.4,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        import json
        return json.loads(raw)

    except json.JSONDecodeError:
        return _fallback_multi_modal(mood_type, intensity, note)
    except Exception as e:
        return _fallback_multi_modal(mood_type, intensity, note)


def _fallback_multi_modal(mood_type: str, intensity: int, note: str = "") -> dict:
    """多模态分析降级模板"""
    fallback = _fallback_analysis(mood_type, intensity)
    return {
        "summary": fallback["summary"],
        "insight": fallback["insight"],
        "suggestion": fallback["suggestion"],
        "music_recommendation": {
            "mood": fallback["music_mood"],
            "bpm": 72 if mood_type == "calm" else 112,
            "title": "定制氛围音乐",
            "texture": "柔和和弦 + 慢速波纹",
        },
        "radar_data": [
            {"mood": "开心", "score": 80 if mood_type == "happy" else 40},
            {"mood": "平静", "score": 80 if mood_type == "calm" else 50},
            {"mood": "焦虑", "score": 70 if mood_type == "anxious" else 20},
            {"mood": "愤怒", "score": 70 if mood_type == "angry" else 15},
            {"mood": "悲伤", "score": 70 if mood_type == "sad" else 20},
            {"mood": "平淡", "score": 70 if mood_type == "neutral" else 40},
        ],
    }
