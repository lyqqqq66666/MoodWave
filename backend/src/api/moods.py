"""
情绪记录 API 路由

提供情绪记录的 CRUD 操作
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime

from src.core.models import (
    MoodEntry,
    MoodEntryCreate,
    MoodEntryUpdate,
    MoodEntryResponse,
    User,
)
from src.db.database import get_session
from src.api.auth import get_current_user

router = APIRouter()


@router.post("/moods", response_model=dict)
async def create_mood(
    mood: MoodEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    创建新的情绪记录

    Args:
        mood: 情绪记录数据（前端传tags数组）
        session: 数据库会话
        current_user: 当前登录用户

    Returns:
        dict: 统一返回格式 {code, msg, data}

    Raises:
        HTTPException: 如果创建失败
    """
    try:
        import json
        # 将 tags 数组转成 JSON 字符串存入数据库
        tags_str = json.dumps(mood.tags, ensure_ascii=False) if isinstance(mood.tags, list) else "[]"
        # 图片 URL 数组 → JSON 字符串
        images_str = json.dumps(mood.images, ensure_ascii=False) if mood.images else "[]"

        db_mood = MoodEntry(
            date=mood.date,
            mood_type=mood.mood_type,
            intensity=mood.intensity,
            tags=tags_str,  # 存 JSON 字符串
            note=mood.note,
            images=images_str,
            image_analysis=mood.image_analysis or "",
            voice_url=mood.voice_url or "",
            voice_text=mood.voice_text or "",
            user_id=current_user.id  # 从 JWT token 解析
        )
        session.add(db_mood)
        session.commit()
        session.refresh(db_mood)
        
        # 返回时，将 JSON 字符串转成数组
        tags_list = json.loads(db_mood.tags) if db_mood.tags else []
        images_list = json.loads(db_mood.images) if db_mood.images else []

        # 返回统一格式
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "id": db_mood.id,
                "date": db_mood.date,
                "mood_type": db_mood.mood_type,
                "intensity": db_mood.intensity,
                "tags": tags_list,  # 返回数组给前端
                "note": db_mood.note,
                "images": images_list,
                "image_analysis": db_mood.image_analysis,
                "voice_url": db_mood.voice_url,
                "voice_text": db_mood.voice_text,
                "created_at": db_mood.created_at.isoformat() if db_mood.created_at else None,
                "updated_at": db_mood.updated_at.isoformat() if db_mood.updated_at else None,
            }
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/moods")
async def list_moods(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取情绪记录列表（仅返回当前用户的记录）

    Args:
        skip: 跳过的记录数
        limit: 返回的最大记录数（用于Dashboard拉取最近3条）
        session: 数据库会话
        current_user: 当前登录用户

    Returns:
        dict: 统一返回格式 {code, msg, data}
    """
    import json
    statement = (
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id)
        .order_by(MoodEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    moods = session.exec(statement).all()
    
    # 转换为响应格式（将JSON字符串转成数组）
    mood_list = []
    for mood in moods:
        # 将 tags 从 JSON 字符串转成数组
        tags_list = json.loads(mood.tags) if mood.tags else []
        images_list = json.loads(mood.images) if mood.images else []

        mood_dict = {
            "id": mood.id,
            "date": mood.date,  # 记录日期（用户指定的"哪一天"）
            "mood_type": mood.mood_type,
            "intensity": mood.intensity,
            "tags": tags_list,  # 返回数组给前端
            "note": mood.note,
            "images": images_list,
            "image_analysis": mood.image_analysis,
            "voice_url": mood.voice_url,
            "voice_text": mood.voice_text,
            "created_at": mood.created_at.isoformat() if mood.created_at else None,
            "updated_at": mood.updated_at.isoformat() if mood.updated_at else None,
        }
        mood_list.append(mood_dict)
    
    return {
        "code": 0,
        "msg": "ok",
        "data": mood_list
    }


@router.get("/moods/{mood_id}")
async def get_mood(
    mood_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    获取单条情绪记录
    
    Args:
        mood_id: 情绪记录 ID
        session: 数据库会话
    
    Returns:
        dict: 统一返回格式 {code, msg, data}
    
    Raises:
        HTTPException: 如果记录不存在
    """
    import json
    mood = session.get(MoodEntry, mood_id)
    if not mood or mood.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="情绪记录不存在")

    tags_list = json.loads(mood.tags) if mood.tags else []
    images_list = json.loads(mood.images) if mood.images else []

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "id": mood.id,
            "date": mood.date,
            "mood_type": mood.mood_type,
            "intensity": mood.intensity,
            "tags": tags_list,  # 返回数组给前端
            "note": mood.note,
            "images": images_list,
            "image_analysis": mood.image_analysis,
            "voice_url": mood.voice_url,
            "voice_text": mood.voice_text,
            "user_id": mood.user_id,
            "created_at": mood.created_at.isoformat() if mood.created_at else None,
            "updated_at": mood.updated_at.isoformat() if mood.updated_at else None,
        }
    }


@router.put("/moods/{mood_id}", response_model=dict)
async def update_mood(
    mood_id: int,
    mood_update: MoodEntryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    更新情绪记录
    
    Args:
        mood_id: 情绪记录 ID
        mood_update: 更新数据（tags可能是数组）
        session: 数据库会话
    
    Returns:
        dict: 统一返回格式 {code, msg, data}
    
    Raises:
        HTTPException: 如果记录不存在
    """
    import json
    mood = session.get(MoodEntry, mood_id)
    if not mood or mood.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="情绪记录不存在")

    update_data = mood_update.model_dump(exclude_unset=True)
    
    # 如果 tags 是数组，转成 JSON 字符串存入数据库
    if "tags" in update_data and isinstance(update_data["tags"], list):
        update_data["tags"] = json.dumps(update_data["tags"], ensure_ascii=False)
    
    update_data["updated_at"] = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(mood, key, value)
    
    session.add(mood)
    session.commit()
    session.refresh(mood)
    
    # 将 tags 从 JSON 字符串转成数组返回
    tags_list = json.loads(mood.tags) if mood.tags else []
    images_list = json.loads(mood.images) if mood.images else []

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "id": mood.id,
            "date": mood.date,
            "mood_type": mood.mood_type,
            "intensity": mood.intensity,
            "tags": tags_list,  # 返回数组给前端
            "note": mood.note,
            "images": images_list,
            "image_analysis": mood.image_analysis,
            "voice_url": mood.voice_url,
            "voice_text": mood.voice_text,
            "user_id": mood.user_id,
            "created_at": mood.created_at.isoformat() if mood.created_at else None,
            "updated_at": mood.updated_at.isoformat() if mood.updated_at else None,
        }
    }


@router.delete("/moods/{mood_id}")
async def delete_mood(
    mood_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    删除情绪记录

    Args:
        mood_id: 情绪记录 ID
        session: 数据库会话

    Returns:
        dict: 删除结果

    Raises:
        HTTPException: 如果记录不存在
    """
    mood = session.get(MoodEntry, mood_id)
    if not mood or mood.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="情绪记录不存在")

    session.delete(mood)
    session.commit()
    return {
        "code": 0,
        "msg": "ok",
        "data": {"deleted": mood_id},
    }


# ==================== 数据导出 ====================

@router.get("/profile/export")
async def export_data(
    format: str = "json",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    导出用户所有情绪记录

    支持 JSON 和 CSV 两种格式。

    Args:
        format: 导出格式，可选 "json" 或 "csv"

    Returns:
        JSON 格式：返回统一格式 {code, msg, data}
        CSV 格式：返回 text/csv 内容
    """
    import json
    import csv
    import io
    from fastapi.responses import Response

    statement = (
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id)
        .order_by(MoodEntry.created_at.desc())
    )
    moods = session.exec(statement).all()

    mood_list = []
    for mood in moods:
        tags_list = json.loads(mood.tags) if mood.tags else []
        images_list = json.loads(mood.images) if mood.images else []
        mood_list.append({
            "id": mood.id,
            "date": mood.date,
            "mood_type": mood.mood_type,
            "intensity": mood.intensity,
            "tags": tags_list,
            "note": mood.note,
            "images": images_list,
            "image_analysis": mood.image_analysis,
            "voice_text": mood.voice_text,
            "created_at": mood.created_at.isoformat() if mood.created_at else None,
        })

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "id", "date", "mood_type", "intensity", "tags", "note",
            "images", "image_analysis", "voice_text", "created_at"
        ])
        writer.writeheader()
        for item in mood_list:
            row = {**item}
            row["tags"] = ",".join(item["tags"]) if isinstance(item["tags"], list) else item["tags"]
            row["images"] = ",".join(item["images"]) if isinstance(item["images"], list) else item["images"]
            writer.writerow(row)

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=moodwave-export.csv"},
        )

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "total": len(mood_list),
            "records": mood_list,
        },
    }
