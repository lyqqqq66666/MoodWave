"""
AI 音乐生成 provider 抽象。

当前只实现 mock provider，不调用真实外部 API。
真实接入 Lyria / ElevenLabs / Mubert 前，需要先准备 API key、账单、COS bucket 和版权策略。
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4


@dataclass
class MusicAssetDraft:
    title: str
    url: str
    object_key: str
    mime_type: str
    size: int
    duration: int
    source: str
    provider: str
    prompt: str
    license_status: str


def create_mock_music_draft(prompt: str, title: str = "MoodWave AI 音乐草稿") -> MusicAssetDraft:
    """生成不扣费的音乐资产占位，用于前端和数据链路联调。"""
    asset_id = uuid4().hex
    return MusicAssetDraft(
        title=title,
        url="",
        object_key=f"mock-ai-music/{asset_id}.wav",
        mime_type="audio/wav",
        size=0,
        duration=30,
        source="mock_ai_music",
        provider="mock",
        prompt=prompt,
        license_status="mock_only",
    )
