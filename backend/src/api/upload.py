"""
文件上传 API 路由

提供图片上传功能
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import os
import uuid

router = APIRouter()


@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...)
):
    """
    上传图片
    
    Args:
        file: 图片文件
        
    Returns:
        dict: 统一返回格式 {code, msg, data}
        
    Raises:
        HTTPException: 如果上传失败
    """
    try:
        # 验证文件类型
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="只支持 JPEG/PNG/GIF/WebP 格式")
        
        # 生成唯一文件名
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        # 保存路径（相对路径，前端可以拼接完整URL）
        upload_dir = "uploads/images"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        
        # 保存文件
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # 返回统一格式
        return {
            "code": 0,
            "msg": "ok",
            "data": {
                "url": f"/{file_path}",  # 相对路径，前端可以拼接完整URL
                "filename": unique_filename,
                "content_type": file.content_type,
                "size": len(contents)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")
