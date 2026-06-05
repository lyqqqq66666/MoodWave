"""
AI 服务层 - DeepSeek API 调用封装

负责：
1. 流式情绪对话 (SSE)
2. 情绪分析（返回结构化结果）
3. 灵音伙伴语义记忆生成
"""

import os
import json
import asyncio
import logging
from typing import AsyncGenerator, Optional, List
from openai import AsyncOpenAI
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 日志配置
logger = logging.getLogger("moodwave.ai_service")

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

CHARACTER_PERSONAS = {
    "cat": {
        "name": "喵呜",
        "style": "温柔软萌，喜欢用'喵~'结尾，像一只会安慰人的小猫",
        "species": "奶油小猫团",
        "sceneTitle": "贴贴治愈舱",
        "orbitPills": ["先蹭蹭你", "委屈可以先放这", "今天不用硬撑"],
        "expressions": ["轻轻蹭一下", "困困地陪你", "小尾巴慢晃"],
    },
    "fox": {
        "name": "绒绒",
        "style": "机灵调皮，偶尔毒舌但很关心人，像森林里的小精灵",
        "species": "焦糖小狐狸",
        "sceneTitle": "拆线松弛舱",
        "orbitPills": ["先找到线头", "别急着全做完", "陪你理出入口"],
        "expressions": ["耳朵轻轻动", "灵机一动", "陪你理线团"],
    },
    "planet": {
        "name": "星诺",
        "style": "温暖治愈，像一个漂浮在宇宙中的小星球，用星空比喻人生",
        "species": "轨道小星兽",
        "sceneTitle": "轨道整理舱",
        "orbitPills": ["理一理线索", "把心绪排成轨道", "先从最小的一件事开始"],
        "expressions": ["专注看着你", "缓慢点头", "安静整理"],
    },
    "sunny": {
        "name": "晴晴",
        "style": "元气满满，像清晨的阳光，给你的阴天带来温暖和希望",
        "species": "暖光小狗团",
        "sceneTitle": "晴光充电舱",
        "orbitPills": ["给你一点元气", "不催你快起来", "只是陪你向前走"],
        "expressions": ["小尾巴轻晃", "亮晶晶眼神", "元气打气"],
    },
    "astronaut": {
        "name": "航航",
        "style": "好奇探索，把情绪比喻成宇宙旅行，用冒险精神看困难",
        "species": "白舱小宇航员",
        "sceneTitle": "任务减压舱",
        "orbitPills": ["先拆成一小步", "一起过 deadline", "任务也能慢慢排队"],
        "expressions": ["认真记录", "抬手确认", "陪你复盘"],
    },
    "moon": {
        "name": "月遥",
        "style": "安静温柔，像月光一样静静陪伴，用夜空的宁静安抚你",
        "species": "月湾小猫灵",
        "sceneTitle": "月湾守候舱",
        "orbitPills": ["把声音放轻一点", "先坐一会儿", "今晚也有人陪你"],
        "expressions": ["慢慢眨眼", "靠近一点", "安静守着你"],
    },
    "sakura": {
        "name": "樱樱",
        "style": "清新自然，像春天樱花一样，带来生机和诗意",
        "species": "花瓣兔团",
        "sceneTitle": "花影小睡舱",
        "orbitPills": ["陪你慢一点", "先落下来", "说一句也可以"],
        "expressions": ["轻眨眼", "抱抱感", "小声鼓励"],
    },
}

# 兼容旧 "star" ID → 映射到 "planet"
CHARACTER_PERSONAS["star"] = CHARACTER_PERSONAS["planet"]

def _build_character_prompt(avatar_character: str = "cat") -> str:
    """根据角色形象构建个性描述"""
    persona = CHARACTER_PERSONAS.get(avatar_character, CHARACTER_PERSONAS["cat"])
    return f"你的角色是「{persona['name']}」，风格：{persona['style']}。"


def _build_system_prompt_chat(
    avatar_character: str = "cat",
    mbti: str = "",
    zodiac: str = "",
) -> str:
    """构建对话系统 prompt，注入角色人设 + 用户个性"""
    character_prompt = _build_character_prompt(avatar_character)

    personality_hint = ""
    if mbti or zodiac:
        parts = []
        if mbti:
            parts.append(f"MBTI 为 {mbti}")
        if zodiac:
            parts.append(f"星座为{zodiac}")
        personality_hint = f"用户{'，'.join(parts)}，请根据此性格特点调整沟通方式。"

    return f"""你是 MoodWave 灵音的 AI 情绪伙伴。

{character_prompt}

你的风格：
- 温暖、有同理心，像一个关心你的朋友
- 不说教、不评判，先理解再建议
- 语言简洁，不超过 150 字/次
- 适当使用 emoji 增加亲切感
{personality_hint}

你的任务：
- 根据用户当前情绪给出个性化回应
- 先共情用户的感受
- 再给出 1-2 个简单可行的情绪调节建议
- 最后推荐用音乐治愈

重要：用中文回答，语气自然亲切。"""


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
    avatar_character: str = "cat",
    mbti: str = "",
    zodiac: str = "",
) -> AsyncGenerator[str, None]:
    """
    流式情绪对话 (SSE)

    Args:
        mood_type: 当前情绪类型 (happy/calm/anxious/angry/sad/neutral)
        intensity: 情绪强度 (1-10)
        user_message: 用户输入的文字
        tags: 情绪标签列表
        history: 历史对话记录 [{"role": "user/assistant", "content": "..."}]
        avatar_character: 角色形象 (cat/fox/star/sunny/astronaut/moon/sakura)
        mbti: 用户 MBTI 类型
        zodiac: 用户星座

    Yields:
        str: SSE 格式的文本块，格式为 "data: {json}\n\n"
    """
    client = _get_client()

    # 构建个性化 system prompt
    system_prompt = _build_system_prompt_chat(avatar_character, mbti, zodiac)

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
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-6:])  # 最多保留最近 3 轮对话
    messages.append({"role": "user", "content": context_text})

    try:
        stream = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=True,
                max_tokens=300,
                temperature=0.8,
                extra_body={"thinking": {"type": "disabled"}},
            ),
            timeout=20.0,  # SSE 流建立超时
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                payload = json.dumps({"type": "text", "content": delta.content}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

        # 流式结束标记
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except asyncio.TimeoutError:
        logger.warning("stream_chat timeout mood=%s", mood_type)
        error_payload = json.dumps({"type": "error", "content": "AI 响应超时，请稍后重试"}, ensure_ascii=False)
        yield f"data: {error_payload}\n\n"
    except Exception as e:
        logger.error("stream_chat error: %s", str(e)[:200])
        error_payload = json.dumps({"type": "error", "content": str(e)}, ensure_ascii=False)
        yield f"data: {error_payload}\n\n"


async def analyze_mood_with_ai(
    mood_type: str,
    intensity: int,
    note: str = "",
    tags: list[str] | None = None,
    mbti: str = "",
    zodiac: str = "",
) -> dict:
    """
    用 AI 分析情绪，返回结构化结果

    Args:
        mood_type: 情绪类型
        intensity: 强度 1-10
        note: 用户文字描述
        tags: 情绪标签
        mbti: 用户 MBTI 类型
        zodiac: 用户星座

    Returns:
        dict: {summary, insight, suggestion, music_mood, energy_level}
    """
    client = _get_client()

    user_content_parts = [
        f"情绪类型：{_mood_label(mood_type)}",
        f"情绪强度：{intensity}/10",
    ]
    if mbti:
        user_content_parts.append(f"用户 MBTI：{mbti}")
    if zodiac:
        user_content_parts.append(f"用户星座：{zodiac}")
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
            extra_body={"thinking": {"type": "disabled"}},
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

def _repair_truncated_json(raw: str) -> str:
    """尝试修复被截断的 JSON：闭合未闭合的括号和引号"""
    # 去除尾部不完整的行
    raw = raw.rstrip()
    
    # 统计未闭合
    open_braces = raw.count("{") - raw.count("}")
    open_brackets = raw.count("[") - raw.count("]")
    
    # 检查是否在字符串中间被截断（引号不成对）
    in_string = False
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == "\\" and i + 1 < len(raw):
            i += 2
            continue
        if ch == '"':
            in_string = not in_string
        i += 1
    
    # 如果在字符串内被截断，补一个引号
    if in_string:
        raw += '"'
    
    # 闭合括号
    raw += "]" * open_brackets
    raw += "}" * open_braces
    
    return raw


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
    if not api_key:
        # 手动读取 .env 兜底
        import pathlib
        env_path = pathlib.Path(__file__).resolve().parent.parent.parent / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("DASHSCOPE_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    
    base_url = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    if not api_key:
        raise ValueError("DASHSCOPE_API_KEY 未配置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


QWEN_VL_MODEL = os.getenv("QWEN_VL_MODEL", "qwen3-vl-plus")
QWEN_ASR_MODEL = os.getenv("QWEN_ASR_MODEL", "qwen3-asr-flash")


async def analyze_images(images: list[dict]) -> dict:
    """
    使用 qwen3-vl-plus 分析图片内容

    Args:
        images: [{"url": str, "mime_type": str}, ...] 图片 URL 和 MIME 类型列表

    Returns:
        dict: { description: str, mood_hint: str, objects: [str] }
    """
    client = _get_dashscope_client()

    if not images:
        return {"description": "", "mood_hint": "", "objects": []}

    try:
        import base64, pathlib

        content_parts = []
        for img in images[:3]:  # 最多3张
            img_url = img["url"]
            mime_type = img.get("mime_type", "image/jpeg")
            # 处理本地文件路径
            if img_url.startswith("/uploads/"):
                local_path = pathlib.Path(__file__).resolve().parent.parent.parent / img_url.lstrip("/")
                if local_path.exists():
                    with open(local_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode()
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"}
                    })
                else:
                    logger.warning("analyze_images file not found: %s", local_path)
                    continue
            elif img_url.startswith("data:"):
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": img_url}
                })
            elif img_url.startswith("http"):
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": img_url}
                })
            else:
                logger.warning("analyze_images unsupported url: %s", img_url)
                continue

        if not content_parts:
            return {"description": "未能加载图片", "mood_hint": "未知", "objects": []}

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
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        return json.loads(raw)  # json 已在模块顶层 import

    except json.JSONDecodeError:
        return {"description": raw[:200] if 'raw' in dir() else "", "mood_hint": "未知", "objects": []}
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
        audio_info = annotations[0] if annotations else None

        # Pydantic 对象用 getattr，不是 .get()
        lang = getattr(audio_info, "language", "zh") if audio_info else "zh"
        emotion = getattr(audio_info, "emotion", "neutral") if audio_info else "neutral"

        return {
            "text": content or "",
            "language": lang,
            "emotion": emotion,
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
    mbti: str = "",
    zodiac: str = "",
) -> dict:
    """
    综合多模态输入，生成完整情绪分析报告

    使用 DeepSeek V4 综合文字 + 图片分析 + 语音转写 + 历史数据 + 用户画像

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
    if mbti:
        parts.append(f"用户 MBTI：{mbti}")
    if zodiac:
        parts.append(f"用户星座：{zodiac}")
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

    max_retries = 1
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            logger.info(
                "analyze_mood_multi_modal attempt=%d/%d mood=%s intensity=%d note_len=%d",
                attempt + 1, max_retries + 1, mood_type, intensity, len(note or ""),
            )

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": user_content},
                    ],
                    stream=False,
                    max_tokens=1000,  # 从 600 提升，防止复杂 JSON 被截断
                    temperature=0.4,
                    extra_body={"thinking": {"type": "disabled"}},
                ),
                timeout=20.0,  # 20s 单次超时，重试后最多 40s，低于 axios 45s
            )

            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            try:
                result = json.loads(raw)  # json 已在模块顶层 import
            except json.JSONDecodeError:
                # 尝试修复被截断的 JSON
                repaired = _repair_truncated_json(raw)
                logger.info("analyze_mood_multi_modal JSON repair attempt")
                try:
                    result = json.loads(repaired)
                except json.JSONDecodeError:
                    raise  # 修复失败，抛回外层异常处理
            logger.info("analyze_mood_multi_modal success attempt=%d", attempt + 1)
            return result

        except asyncio.TimeoutError:
            last_error = "timeout"
            logger.warning("analyze_mood_multi_modal timeout attempt=%d", attempt + 1)

        except json.JSONDecodeError:
            last_error = "json_parse"
            logger.warning("analyze_mood_multi_modal JSON parse error attempt=%d raw=%s", attempt + 1, raw[:200] if 'raw' in dir() else "N/A")

        except Exception as e:
            last_error = str(e)[:200]
            logger.error("analyze_mood_multi_modal error attempt=%d: %s", attempt + 1, last_error)

    # 所有重试均失败，降级到规则模板
    logger.warning("analyze_mood_multi_modal fallback triggered last_error=%s", last_error)
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


# ==================== 灵音伙伴语义记忆 ====================

COMPANION_MEMORY_PROMPT = """你是 MoodWave 灵音的 AI 伙伴记忆系统。

用户最近记录了以下情绪数据。请基于这些数据，生成 3-5 条「伙伴记忆」。
每条记忆应该像是一个关心用户的朋友记住的关于 TA 的事情，语气温柔、个性化。

记忆类型说明：
- personality: 用户性格特征（如"你是个感性的人"）
- preference: 用户偏好（如"你喜欢安静的音乐"）
- habit: 用户习惯（如"你周一容易焦虑"）
- event: 具体事件（如"你昨天提到考试压力"）

记忆要求：
- 每条 12-30 字
- 基于数据模式而非编造
- 语气温暖治愈，不说教
- 可以引用具体数据（如"你最多的一天..."）
- 可以给出温柔的观察（如"你似乎在学习日容易紧张"）

严格按以下 JSON 格式返回，不要输出额外文字：
{
  "memories": [
    {
      "content": "记忆内容 1",
      "memory_type": "personality",
      "mood_context": "anxious",
      "tags": ["study", "exam"]
    },
    {
      "content": "记忆内容 2",
      "memory_type": "habit",
      "mood_context": null,
      "tags": ["work"]
    }
  ]
}"""


async def generate_companion_memories(
    mood_entries: List[dict],
    avatar_character: str = "cat",
    mbti: str = "",
    zodiac: str = "",
) -> List[dict]:
    """
    使用 AI 基于情绪历史生成个性化伙伴记忆

    Args:
        mood_entries: 情绪记录列表，每项含 mood_type, intensity, tags, note, date
        avatar_character: 角色形象
        mbti: 用户 MBTI
        zodiac: 用户星座

    Returns:
        List[dict]: 3-5 条个性化记忆点，每条包含 content, memory_type, mood_context, tags
    """
    if len(mood_entries) < 3:
        return []

    client = _get_client()

    # 构建数据摘要
    lines = ["以下为用户最近的情绪记录数据：", ""]
    for i, entry in enumerate(mood_entries[:30], 1):
        mood_label = _mood_label(entry.get("mood_type", ""))
        intensity = entry.get("intensity", 0)
        tags = entry.get("tags", [])
        tags_str = ", ".join(tags) if tags else "无"
        note = (entry.get("note") or "")[:40]
        date = entry.get("date", "")
        lines.append(
            f"{i}. [{date}] 情绪={mood_label} 强度={intensity}/10 标签={tags_str}"
            + (f' 笔记="{note}"' if note else "")
        )

    # 统计摘要
    mood_counts = {}
    all_tags = []
    intensities = []
    for entry in mood_entries:
        mt = entry.get("mood_type", "")
        mood_counts[mt] = mood_counts.get(mt, 0) + 1
        if entry.get("tags"):
            all_tags.extend(entry["tags"])
        if entry.get("intensity"):
            intensities.append(entry["intensity"])

    dominant = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    avg_intensity = sum(intensities) / len(intensities) if intensities else 5
    from collections import Counter
    top_tag = Counter(all_tags).most_common(1)[0][0] if all_tags else ""

    lines.append("")
    lines.append(f"数据摘要：共{len(mood_entries)}条记录，主导情绪={_mood_label(dominant)}，平均强度={avg_intensity:.1f}/10")
    if top_tag:
        lines.append(f"高频标签：{top_tag}")

    user_content = "\n".join(lines)

    personality_hint = ""
    if avatar_character:
        persona = CHARACTER_PERSONAS.get(avatar_character, CHARACTER_PERSONAS["cat"])
        personality_hint = f"伙伴角色是「{persona['name']}」，风格：{persona['style']}。记忆语气应符合此角色。"
    if mbti or zodiac:
        parts = []
        if mbti:
            parts.append(f"MBTI={mbti}")
        if zodiac:
            parts.append(f"星座={zodiac}")
        personality_hint += f" 用户{'，'.join(parts)}。"

    try:
        logger.info("generate_companion_memories entries=%d character=%s", len(mood_entries), avatar_character)

        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": COMPANION_MEMORY_PROMPT + ("\n" + personality_hint if personality_hint else "")},
                    {"role": "user", "content": user_content},
                ],
                stream=False,
                max_tokens=600,  # 增加 token 以容纳结构化输出
                temperature=0.7,
                extra_body={"thinking": {"type": "disabled"}},
            ),
            timeout=25.0,
        )

        raw = response.choices[0].message.content
        if not raw or not raw.strip():
            logger.warning("generate_companion_memories empty response from AI")
            return []

        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        if not raw:
            logger.warning("generate_companion_memories empty after stripping code blocks")
            return []

        try:
            result = json.loads(raw)  # json 已在模块顶层 import
            memories = result.get("memories", [])
            
            # 验证并标准化返回格式
            valid_memories = []
            for mem in memories:
                if isinstance(mem, dict) and "content" in mem:
                    valid_memories.append({
                        "content": mem["content"],
                        "memory_type": mem.get("memory_type", "personality"),
                        "mood_context": mem.get("mood_context"),
                        "tags": mem.get("tags", []),
                    })
                elif isinstance(mem, str):
                    # 兼容旧格式（纯字符串）
                    valid_memories.append({
                        "content": mem,
                        "memory_type": "personality",
                        "mood_context": None,
                        "tags": [],
                    })
            
            logger.info("generate_companion_memories success count=%d", len(valid_memories))
            return valid_memories[:5]  # 最多 5 条

        except json.JSONDecodeError:
            logger.warning("generate_companion_memories JSON parse failed raw=%s", raw[:200])
            # 尝试从非 JSON 文本中逐行提取记忆（降级处理）
            lines = [line.strip("- ").strip() for line in raw.split("\n") if line.strip() and len(line.strip()) > 4]
            memories = []
            for line in lines[:5]:
                memories.append({
                    "content": line,
                    "memory_type": "personality",
                    "mood_context": None,
                    "tags": [],
                })
            if memories:
                logger.info("generate_companion_memories extracted %d memories from text fallback", len(memories))
                return memories
            return []

    except asyncio.TimeoutError:
        logger.warning("generate_companion_memories timeout")
        return []
    except Exception as e:
        logger.error("generate_companion_memories error: %s", str(e)[:200])
        return []


# ==================== 动态欢迎语生成 ====================

GREETING_PROMPT = """你是 MoodWave 灵音的 AI 情绪伙伴，负责生成个性化的欢迎语。

你的任务：
1. 根据用户当天的情绪记录，生成温暖、有同理心的欢迎语
2. 欢迎语要符合当前角色形象的语气风格
3. 生成 2-3 条开场白，引导用户继续对话
4. 语言简洁，每条不超过 50 字

请严格按照以下 JSON 格式返回，不要输出任何额外文字：
{
  "greeting": "主欢迎语，结合用户情绪和角色风格",
  "starter_messages": ["开场白1", "开场白2", "开场白3"]
}"""


def _fallback_greeting(character: str, mood_type: str | None = None) -> dict:
    """AI 调用失败时的降级欢迎语模板"""
    # 角色特定的欢迎语模板
    character_templates = {
        "cat": {
            "happy": "喵~ 看到你今天心情很好呢！有什么开心的事想分享吗？",
            "calm": "喵~ 今天感觉很平静呢，小喵陪你一起享受这份宁静。",
            "anxious": "喵~ 小喵感觉到你有点紧张，来，深呼吸，我在呢。",
            "angry": "喵~ 看到你有点生气，小喵在这里陪你，想聊聊吗？",
            "sad": "喵~ 小喵感觉到你有些难过，来，让我抱抱你。",
            "neutral": "喵~ 欢迎回来！今天过得怎么样？",
        },
        "fox": {
            "happy": "嘿！看到你今天状态不错嘛~ 有什么好事发生？",
            "calm": "今天挺平静的嘛，不错不错，继续保持~",
            "anxious": "哦？感觉你有点紧张？来，小狐狸帮你分析分析。",
            "angry": "哎呀，谁惹你了？来，跟我说说，我帮你出主意。",
            "sad": "怎么啦？看起来心情不太好，小狐狸陪你聊聊。",
            "neutral": "嘿，回来啦~ 今天有什么想聊的？",
        },
        "planet": {
            "happy": "看到你今天闪闪发光呢！有什么开心的事想分享吗？",
            "calm": "今天很平静呢，像星空一样宁静，真好。",
            "anxious": "感觉到你有些不安，没关系，星诺会陪着你。",
            "angry": "情绪有些波动呢，没关系，让星诺帮你平复一下。",
            "sad": "看到你有些低落，星诺在这里，静静陪你。",
            "neutral": "欢迎回来，今天过得怎么样？",
        },
        "sunny": {
            "happy": "哇！看到你今天心情超好！阳光都为你灿烂！",
            "calm": "今天很平静呢，阳光温柔地照着，真舒服。",
            "anxious": "感觉你有点紧张？来，深呼吸，阳光会给你力量。",
            "angry": "哎呀，谁惹你了？来，阳光帮你驱散阴霾。",
            "sad": "怎么啦？看起来心情不太好，阳光在这里陪你。",
            "neutral": "嘿，回来啦！今天过得怎么样？",
        },
        "astronaut": {
            "happy": "探测到你今天情绪指数飙升！有什么开心的事？",
            "calm": "今天情绪轨道很平稳呢，继续航行~",
            "anxious": "检测到情绪波动，别担心，宇航员陪你穿越。",
            "angry": "情绪能量过高，启动稳定程序，深呼吸~",
            "sad": "探测到低落信号，宇航员在这里，陪你度过。",
            "neutral": "欢迎回到空间站，今天航行顺利吗？",
        },
        "moon": {
            "happy": "看到你今天心情很好呢，月光都为你闪耀。",
            "calm": "今天很平静呢，月光静静陪你。",
            "anxious": "感觉到你有些不安，月光在这里，静静安抚你。",
            "angry": "情绪有些波动呢，没关系，月光帮你平复。",
            "sad": "看到你有些低落，月光在这里，静静陪你。",
            "neutral": "欢迎回来，今天过得怎么样？",
        },
        "sakura": {
            "happy": "看到你今天心情很好呢，樱花都为你绽放！",
            "calm": "今天很平静呢，像春风拂过樱花，真舒服。",
            "anxious": "感觉到你有些不安，没关系，樱花会陪着你。",
            "angry": "情绪有些波动呢，没关系，让樱花帮你平复。",
            "sad": "看到你有些低落，樱花在这里，静静陪你。",
            "neutral": "欢迎回来，今天过得怎么样？",
        },
    }

    # 获取角色模板，如果角色不存在则使用 cat
    templates = character_templates.get(character, character_templates["cat"])

    # 根据情绪类型选择模板
    greeting = templates.get(mood_type, templates.get("neutral", "欢迎回来！今天过得怎么样？"))

    # 生成开场白
    starters = [
        "想聊聊今天发生了什么吗？",
        "有什么我可以帮你的吗？",
        "来，跟我说说你的心事。",
    ]

    return {
        "greeting": greeting,
        "starter_messages": starters,
    }


async def generate_greeting(
    character: str,
    mood_type: str | None = None,
    intensity: int | None = None,
    note: str = "",
    mbti: str = "",
    zodiac: str = "",
) -> dict:
    """
    生成动态欢迎语

    Args:
        character: 角色形象 (cat/fox/star/sunny/astronaut/moon/sakura)
        mood_type: 当前情绪类型 (可选，None 表示今天没有记录)
        intensity: 情绪强度 (可选)
        note: 用户文字描述 (可选)
        mbti: 用户 MBTI (可选)
        zodiac: 用户星座 (可选)

    Returns:
        dict: {greeting, starter_messages, source, mood_type, character}
    """
    client = _get_client()

    # 构建角色信息
    persona = CHARACTER_PERSONAS.get(character, CHARACTER_PERSONAS["cat"])

    # 构建上下文
    if mood_type:
        # 今天有情绪记录
        context_parts = [
            f"用户今天的情绪是：{_mood_label(mood_type)}",
        ]
        if intensity:
            context_parts.append(f"情绪强度：{intensity}/10")
        if note.strip():
            context_parts.append(f"用户描述：{note[:100]}")
        context_parts.append(f"你的角色是「{persona['name']}」，风格：{persona['style']}")

        user_content = "\n".join(context_parts)
        source = "today_mood"
    else:
        # 今天没有情绪记录
        context_parts = [
            "用户今天还没有记录情绪",
            f"你的角色是「{persona['name']}」，风格：{persona['style']}",
            "请生成一个温暖的欢迎语，引导用户开始记录或聊天。",
        ]
        user_content = "\n".join(context_parts)
        source = "default"

    # 添加个性信息
    personality_hint = ""
    if mbti or zodiac:
        parts = []
        if mbti:
            parts.append(f"MBTI={mbti}")
        if zodiac:
            parts.append(f"星座={zodiac}")
        personality_hint = f" 用户{'，'.join(parts)}。"

    try:
        logger.info("generate_greeting character=%s mood=%s", character, mood_type)

        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": GREETING_PROMPT + ("\n" + personality_hint if personality_hint else "")},
                    {"role": "user", "content": user_content},
                ],
                stream=False,
                max_tokens=200,
                temperature=0.8,
                extra_body={"thinking": {"type": "disabled"}},
            ),
            timeout=10.0,  # 欢迎语生成超时 10 秒
        )

        raw = response.choices[0].message.content
        if not raw or not raw.strip():
            logger.warning("generate_greeting empty response from AI")
            return {
                **_fallback_greeting(character, mood_type),
                "source": source,
                "mood_type": mood_type,
                "character": character,
            }

        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        if not raw:
            logger.warning("generate_greeting empty after stripping code blocks")
            return {
                **_fallback_greeting(character, mood_type),
                "source": source,
                "mood_type": mood_type,
                "character": character,
            }

        try:
            result = json.loads(raw)  # json 已在模块顶层 import
        except json.JSONDecodeError:
            logger.warning("generate_greeting JSON parse failed raw=%s", raw[:200])
            return {
                **_fallback_greeting(character, mood_type),
                "source": source,
                "mood_type": mood_type,
                "character": character,
            }

        # 验证必要字段
        greeting = result.get("greeting", "")
        starter_messages = result.get("starter_messages", [])

        if not greeting or not starter_messages:
            logger.warning("generate_greeting missing required fields")
            return {
                **_fallback_greeting(character, mood_type),
                "source": source,
                "mood_type": mood_type,
                "character": character,
            }

        logger.info("generate_greeting success character=%s", character)
        return {
            "greeting": greeting,
            "starter_messages": starter_messages[:3],  # 最多 3 条
            "source": source,
            "mood_type": mood_type,
            "character": character,
        }

    except asyncio.TimeoutError:
        logger.warning("generate_greeting timeout")
        return {
            **_fallback_greeting(character, mood_type),
            "source": source,
            "mood_type": mood_type,
            "character": character,
        }
    except Exception as e:
        logger.error("generate_greeting error: %s", str(e)[:200])
        return {
            **_fallback_greeting(character, mood_type),
            "source": source,
            "mood_type": mood_type,
            "character": character,
        }
