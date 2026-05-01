"""
文件上传 API 路由

提供图片、语音、头像上传功能
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
import os
import uuid

from sqlmodel import Session
from src.core.models import User
from src.db.database import get_session
from src.api.auth import get_current_user
from src.services.ai_service import transcribe_voice

router = APIRouter()


@router.post("/upload/image")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    上传图片（支持多文件，最多3张）

    Args:
        files: 图片文件列表

    Returns:
        dict: 统一返回格式 {code, msg, data}
        data = { urls: [str], filenames: [str] }
    """
    try:
        if len(files) > 3:
            raise HTTPException(status_code=400, detail="最多上传3张图片")

        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        results = []

        for file in files:
            if file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail=f"不支持的文件格式: {file.content_type}")

            file_ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "jpg"
            unique_filename = f"{uuid.uuid4()}.{file_ext}"

            upload_dir = "uploads/images"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, unique_filename)

            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            results.append({
                "url": f"/{file_path}",
                "filename": unique_filename,
                "content_type": file.content_type,
                "size": len(contents),
            })

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "urls": [r["url"] for r in results],
                "files": results,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@router.post("/upload/voice")
async def upload_voice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    上传语音文件

    Args:
        file: 音频文件（WAV/MP3/OGG）

    Returns:
        dict: 统一返回格式 {code, msg, data}
    """
    try:
        allowed_types = [
            "audio/wav", "audio/mpeg", "audio/mp3",
            "audio/ogg", "audio/webm", "audio/x-wav",
            "application/octet-stream",  # 浏览器 MediaRecorder 常见类型
        ]
        if file.content_type not in allowed_types:
            # 宽松处理：浏览器录音格式可能不标准
            print(f"[upload] 语音文件 content_type={file.content_type}，允许上传")

        file_ext = "wav"
        if file.filename and "." in file.filename:
            file_ext = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"

        upload_dir = "uploads/voices"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # 调用 qwen3-asr-flash 转录语音
        url = f"/{file_path}"
        abs_path = os.path.abspath(file_path)
        duration = round(len(contents) / 32000, 1)  # 估算：16kHz mono 16bit ≈ 32KB/s

        voice_text = ""
        try:
            transcription = await transcribe_voice(abs_path)
            voice_text = transcription.get("text", "")
        except Exception as e:
            print(f"[upload] 语音转录失败（不影响上传）: {e}")

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "url": url,
                "filename": unique_filename,
                "content_type": file.content_type,
                "size": len(contents),
                "voice_text": voice_text,
                "duration": duration,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音上传失败: {str(e)}")


@router.post("/upload/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    上传用户头像

    Args:
        file: 图片文件

    Returns:
        dict: 统一返回格式 {code, msg, data}
    """
    try:
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="只支持 JPEG/PNG/GIF/WebP 格式")

        file_ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "jpg"
        unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"

        upload_dir = "uploads/avatars"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # 保存到数据库
        avatar_url = f"/{file_path}"
        current_user.avatar_url = avatar_url
        session.add(current_user)
        session.commit()

        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "url": avatar_url,
                "filename": unique_filename,
                "size": len(contents),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"头像上传失败: {str(e)}")
