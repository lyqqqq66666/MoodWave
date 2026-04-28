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
)
from src.db.database import get_session

router = APIRouter()


@router.post("/moods", response_model=dict)
async def create_mood(
    mood: MoodEntryCreate,
    session: Session = Depends(get_session),
):
    """
    创建新的情绪记录
    
    Args:
        mood: 情绪记录数据（前端传tags数组）
        session: 数据库会话
    
    Returns:
        dict: 统一返回格式 {code, msg, data}
    
    Raises:
        HTTPException: 如果创建失败
    """
    try:
        import json
        # 将 tags 数组转成 JSON 字符串存入数据库
        tags_str = json.dumps(mood.tags, ensure_ascii=False) if isinstance(mood.tags, list) else "[]"
        
        db_mood = MoodEntry(
            date=mood.date,
            mood_type=mood.mood_type,
            intensity=mood.intensity,
            tags=tags_str,  # 存 JSON 字符串
            note=mood.note,
            user_id=1  # MVP阶段使用固定用户
        )
        session.add(db_mood)
        session.commit()
        session.refresh(db_mood)
        
        # 返回时，将 JSON 字符串转成数组
        tags_list = json.loads(db_mood.tags) if db_mood.tags else []
        
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
):
    """
    获取情绪记录列表
    
    Args:
        skip: 跳过的记录数
        limit: 返回的最大记录数（用于Dashboard拉取最近3条）
        session: 数据库会话
    
    Returns:
        dict: 统一返回格式 {code, msg, data}
    """
    import json
    statement = select(MoodEntry).offset(skip).limit(limit)
    moods = session.exec(statement).all()
    
    # 转换为响应格式（将JSON字符串转成数组）
    mood_list = []
    for mood in moods:
        # 将 tags 从 JSON 字符串转成数组
        tags_list = json.loads(mood.tags) if mood.tags else []
        
        mood_dict = {
            "id": mood.id,
            "mood_type": mood.mood_type,
            "intensity": mood.intensity,
            "tags": tags_list,  # 返回数组给前端
            "note": mood.note,
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
    if not mood:
        raise HTTPException(status_code=404, detail="情绪记录不存在")
    
    # 将 tags 从 JSON 字符串转成数组
    tags_list = json.loads(mood.tags) if mood.tags else []
    
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
    if not mood:
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
            "user_id": mood.user_id,
            "created_at": mood.created_at.isoformat() if mood.created_at else None,
            "updated_at": mood.updated_at.isoformat() if mood.updated_at else None,
        }
    }


@router.delete("/moods/{mood_id}")
async def delete_mood(
    mood_id: int,
    session: Session = Depends(get_session),
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
    if not mood:
        raise HTTPException(status_code=404, detail="情绪记录不存在")

    session.delete(mood)
    session.commit()
    return {"message": "情绪记录已删除"}
