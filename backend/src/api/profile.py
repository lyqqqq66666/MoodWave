"""
个人主页 + 数据导出 API 路由

提供：
- GET  /api/profile/export    数据导出（支持多维度组合 + JSON/CSV 格式）
- POST /api/profile/export    数据导出（POST 版本，适合大量参数）
"""

import json
import csv
import io as _io
from datetime import datetime, timedelta
from collections import Counter
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session, select
from pydantic import BaseModel

from src.core.models import (
    User, MoodEntry, FavoriteMusic,
)
from src.db.database import get_session
from src.api.auth import get_current_user
from src.api.analytics import calculate_mood_score

router = APIRouter(prefix="/profile", tags=["profile"])

# ==================== 请求模型 ====================

class ExportRequest(BaseModel):
    """导出请求体（POST 版本）"""
    format: str = "json"  # json | csv
    scope: str = "all"    # all | 30d | 7d
    include: List[str] = ["records", "summary"]  # records, summary, profile, favorites

# ==================== 导出数据聚合逻辑 ====================

def _build_date_filter(scope: str) -> Optional[str]:
    """
    根据 scope 参数构建日期过滤条件

    Args:
        scope: "all" | "30d" | "7d"

    Returns:
        str | None: 日期前缀过滤字符串，或 None（全部）
    """
    if scope == "7d":
        return str((datetime.utcnow() - timedelta(days=7)).date())
    if scope == "30d":
        return str((datetime.utcnow() - timedelta(days=30)).date())
    return None


def _export_records(session: Session, user_id: int, date_from: Optional[str]) -> List[dict]:
    """
    导出情绪记录数据

    包含字段：id, date, mood_type, intensity, tags, note,
              images, image_analysis, voice_url, voice_text,
              created_at, updated_at
    """
    statement = select(MoodEntry).where(MoodEntry.user_id == user_id)
    if date_from:
        statement = statement.where(MoodEntry.date >= date_from)
    statement = statement.order_by(MoodEntry.date.desc(), MoodEntry.created_at.desc())

    entries = session.exec(statement).all()

    records = []
    for entry in entries:
        # 解析 tags JSON 字符串
        try:
            tags = json.loads(entry.tags) if entry.tags else []
        except (json.JSONDecodeError, TypeError):
            tags = entry.tags or []

        # 解析 images JSON 字符串
        try:
            images = json.loads(entry.images) if entry.images else []
        except (json.JSONDecodeError, TypeError):
            images = entry.images or []

        records.append({
            "id": entry.id,
            "date": entry.date,
            "mood_type": entry.mood_type,
            "intensity": entry.intensity,
            "tags": tags,
            "note": entry.note,
            "images": images,
            "image_analysis": entry.image_analysis or "",
            "voice_url": entry.voice_url or "",
            "voice_text": entry.voice_text or "",
            "created_at": entry.created_at.isoformat() if entry.created_at else "",
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else "",
        })

    return records


def _export_summary(session: Session, user_id: int, date_from: Optional[str]) -> dict:
    """
    导出情绪分析汇总数据

    包含字段：total_moods, dominant_mood, avg_score, mood_distribution,
              mood_trend, top_tags, streak_days
    """
    statement = select(MoodEntry).where(MoodEntry.user_id == user_id)
    if date_from:
        statement = statement.where(MoodEntry.date >= date_from)

    entries = session.exec(statement).all()

    if not entries:
        return {
            "total_moods": 0,
            "dominant_mood": "neutral",
            "avg_score": 0,
            "mood_distribution": [],
            "mood_trend": [],
            "top_tags": [],
            "streak_days": 0,
        }

    total = len(entries)

    # 主导情绪
    mood_counts = Counter(e.mood_type for e in entries)
    dominant_mood = mood_counts.most_common(1)[0][0] if mood_counts else "neutral"

    # 情绪分布（百分比）
    mood_distribution = [
        {
            "mood_type": mt,
            "count": cnt,
            "percentage": round(cnt / total * 100, 1),
        }
        for mt, cnt in mood_counts.most_common()
    ]

    # 平均分
    avg_score = round(
        sum(calculate_mood_score(e.mood_type, e.intensity) for e in entries) / total, 1
    )

    # 每日情绪趋势（按日期聚合）
    from collections import defaultdict
    daily = defaultdict(lambda: {"count": 0, "total_intensity": 0, "types": []})
    for e in entries:
        daily[e.date]["count"] += 1
        daily[e.date]["total_intensity"] += e.intensity
        daily[e.date]["types"].append(e.mood_type)

    mood_trend = [
        {
            "date": d,
            "count": info["count"],
            "avg_intensity": round(info["total_intensity"] / info["count"], 1),
            "dominant_mood": Counter(info["types"]).most_common(1)[0][0],
        }
        for d, info in sorted(daily.items())
    ]

    # 标签统计
    all_tags = []
    for e in entries:
        if e.tags:
            try:
                all_tags.extend(json.loads(e.tags))
            except (json.JSONDecodeError, TypeError):
                pass
    top_tags = [tag for tag, _ in Counter(all_tags).most_common(10)]

    # 连续记录天数
    all_dates = set(e.date for e in entries)
    streak = 0
    check = datetime.utcnow().date()
    while str(check) in all_dates:
        streak += 1
        check -= timedelta(days=1)

    return {
        "total_moods": total,
        "dominant_mood": dominant_mood,
        "avg_score": avg_score,
        "mood_distribution": mood_distribution,
        "mood_trend": mood_trend,
        "top_tags": top_tags,
        "streak_days": streak,
    }


def _export_profile(user: User) -> dict:
    """
    导出用户个人资料

    包含字段：id, email, username, avatar_url, mbti,
              avatar_character, zodiac, created_at
    """
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url or "",
        "mbti": user.mbti or "",
        "avatar_character": user.avatar_character or "cat",
        "zodiac": user.zodiac or "",
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


def _export_favorites(session: Session, user_id: int) -> List[dict]:
    """
    导出收藏音乐列表

    包含字段：id, music_id, title, artist, mood_type, created_at
    """
    statement = select(FavoriteMusic).where(FavoriteMusic.user_id == user_id)
    statement = statement.order_by(FavoriteMusic.created_at.desc())
    favorites = session.exec(statement).all()

    return [
        {
            "id": f.id,
            "music_id": f.music_id,
            "title": f.title,
            "artist": f.artist,
            "mood_type": f.mood_type,
            "created_at": f.created_at.isoformat() if f.created_at else "",
        }
        for f in favorites
    ]


def _flatten_records_for_csv(records: List[dict]) -> List[dict]:
    """将嵌套列表字段展平为字符串，适配 CSV 输出"""
    flat = []
    for r in records:
        flat.append({
            **r,
            "tags": "、".join(r.get("tags", [])) if isinstance(r.get("tags"), list) else str(r.get("tags", "")),
            "images": "、".join(r.get("images", [])) if isinstance(r.get("images"), list) else str(r.get("images", "")),
        })
    return flat


def _records_to_csv(records: List[dict]) -> str:
    """将情绪记录列表转为 CSV 字符串（带 UTF-8 BOM）"""
    if not records:
        return ""

    flat = _flatten_records_for_csv(records)
    output = _io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM，防止 Excel 打开中文乱码

    writer = csv.DictWriter(output, fieldnames=flat[0].keys())
    writer.writeheader()
    writer.writerows(flat)

    return output.getvalue()


def _json_to_csv(json_data: dict) -> str:
    """
    将完整的 JSON 导出数据转为多 sheet 风格的 CSV。
    由于 CSV 不原生支持多 sheet，我们使用分段格式：
    在每个 section 前加 # --- SECTION: xxx --- 注释行。
    """
    output = _io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM

    # Section 1: 个人资料
    if json_data.get("profile"):
        output.write("# --- 个人资料 ---\n")
        profile = json_data["profile"]
        profile_keys = list(profile.keys())
        writer = csv.DictWriter(output, fieldnames=profile_keys)
        writer.writeheader()
        writer.writerow(profile)
        output.write("\n")

    # Section 2: 情绪记录
    if json_data.get("records"):
        output.write("# --- 情绪记录 ---\n")
        flat_records = _flatten_records_for_csv(json_data["records"])
        if flat_records:
            writer = csv.DictWriter(output, fieldnames=flat_records[0].keys())
            writer.writeheader()
            writer.writerows(flat_records)
        output.write("\n")

    # Section 3: 收藏音乐
    if json_data.get("favorites"):
        output.write("# --- 收藏音乐 ---\n")
        favorites = json_data["favorites"]
        if favorites:
            writer = csv.DictWriter(output, fieldnames=favorites[0].keys())
            writer.writeheader()
            writer.writerows(favorites)
        output.write("\n")

    # Section 4: 分析汇总（summary 中非列表字段扁平化）
    if json_data.get("summary"):
        output.write("# --- 分析汇总 ---\n")
        summary = json_data["summary"]
        # 扁平化：列表字段序列化为字符串
        flat_summary = {}
        for key, value in summary.items():
            if isinstance(value, list):
                flat_summary[key] = json.dumps(value, ensure_ascii=False)
            elif isinstance(value, dict):
                flat_summary[key] = json.dumps(value, ensure_ascii=False)
            else:
                flat_summary[key] = str(value) if value is not None else ""
        writer = csv.DictWriter(output, fieldnames=list(flat_summary.keys()))
        writer.writeheader()
        writer.writerow(flat_summary)
        output.write("\n")

    return output.getvalue()


# ==================== 导出接口 ====================

@router.get("/export")
async def export_data_get(
    format: str = Query("json", description="导出格式：json 或 csv"),
    scope: str = Query("all", description="导出范围：all / 30d / 7d"),
    include: Optional[str] = Query("records,summary", description="导出维度（逗号分隔）：records, summary, profile, favorites"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    导出用户数据（GET 版本）

    支持多维度组合导出：
    - records:  情绪记录（全量或按 scope 筛选）
    - summary:  分析汇总（主导情绪、趋势、标签统计）
    - profile:  用户个人资料
    - favorites: 收藏音乐列表

    示例：
    - `/api/profile/export?format=json&include=records,summary,profile`
    - `/api/profile/export?format=csv&scope=30d&include=records`
    """
    return _build_export_response(format, scope, include, current_user, session)


@router.post("/export")
async def export_data_post(
    body: ExportRequest = Body(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    导出用户数据（POST 版本，推荐）

    适合大量参数，Body 格式：
    ```json
    {
        "format": "json",
        "scope": "all",
        "include": ["records", "summary", "profile", "favorites"]
    }
    ```
    """
    include_str = ",".join(body.include) if body.include else "records,summary"
    return _build_export_response(body.format, body.scope, include_str, current_user, session)


def _build_export_response(
    format: str,
    scope: str,
    include_str: Optional[str],
    current_user: User,
    session: Session,
):
    """
    构建导出响应（GET 和 POST 共用）
    """
    # 参数校验
    if format not in ("json", "csv"):
        raise HTTPException(status_code=400, detail="format 参数仅支持 json 或 csv")

    if scope not in ("all", "30d", "7d"):
        raise HTTPException(status_code=400, detail="scope 参数仅支持 all / 30d / 7d")

    include_list = [item.strip() for item in (include_str or "records,summary").split(",") if item.strip()]
    valid_includes = {"records", "summary", "profile", "favorites"}
    for item in include_list:
        if item not in valid_includes:
            raise HTTPException(
                status_code=400,
                detail=f"include 参数不支持 '{item}'，仅支持：{', '.join(sorted(valid_includes))}"
            )

    # 构建日期过滤
    date_from = _build_date_filter(scope)

    # 聚合数据
    export_data: dict = {}
    records = None

    if "records" in include_list:
        records = _export_records(session, current_user.id, date_from)
        export_data["records"] = records

    if "summary" in include_list:
        export_data["summary"] = _export_summary(session, current_user.id, date_from)

    if "profile" in include_list:
        export_data["profile"] = _export_profile(current_user)

    if "favorites" in include_list:
        export_data["favorites"] = _export_favorites(session, current_user.id)

    # 元信息
    export_data["export_meta"] = {
        "exported_at": datetime.utcnow().isoformat(),
        "user_id": current_user.id,
        "scope": scope,
        "format": format,
        "include": include_list,
    }

    # CSV 输出
    if format == "csv":
        from fastapi.responses import Response
        csv_content = _json_to_csv(export_data)

        # 生成文件名（ASCII safe，避免 Content-Disposition 编码问题）
        date_tag = datetime.utcnow().strftime("%Y%m%d")
        safe_username = current_user.username.encode("ascii", errors="ignore").decode() or "user"
        filename = f"moodwave-export-{safe_username}-{date_tag}.csv"

        return Response(
            content=csv_content.encode("utf-8-sig"),
            media_type="text/csv; charset=utf-8-sig",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    # JSON 输出
    return {
        "code": 0,
        "msg": "ok",
        "data": export_data,
    }
