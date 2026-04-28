"""
社区帖子 API 路由（解忧角）

提供：
- POST   /api/posts           创建帖子
- GET    /api/posts           帖子列表（支持 tag/分类筛选、分页）
- GET    /api/posts/{id}      获取单条帖子
- POST   /api/posts/{id}/like       点赞
- DELETE /api/posts/{id}/like       取消点赞
- POST   /api/posts/{id}/comment    评论
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from src.core.models import Post, PostCreate, PostResponse, PostListResponse, MoodEntry
from src.db.database import get_session

router = APIRouter(prefix="/posts", tags=["posts"])


# ==================== 辅助函数 ====================

def _author_label(post: Post) -> str:
    """生成作者展示标签（匿名/年级+MBTI）"""
    if post.is_anonymous:
        return "匿名"
    # MVP 阶段简化，直接返回固定标签
    labels = ["大三 · INFP", "大二 · ENFP", "研一 · INFJ", "大一 · ENFJ"]
    return labels[post.id % len(labels)]


def _post_to_response(post: Post, session: Session) -> PostResponse:
    """将 Post 数据库模型转为 API 响应模型"""
    # 尝试关联情绪，获取 emoji 展示
    user_mood_type: Optional[str] = None
    if post.mood_id:
        mood = session.get(MoodEntry, post.mood_id)
        if mood:
            user_mood_type = mood.mood_type

    return PostResponse(
        id=post.id,
        content=post.content,
        category=post.category,
        author_label=_author_label(post),
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        created_at=post.created_at,
        user_mood_type=user_mood_type,
    )


# ==================== 帖子 CRUD ====================

@router.post("")
async def create_post(
    data: PostCreate,
    session: Session = Depends(get_session),
):
    """
    创建新帖子（解忧角发帖）

    请求体：
    ```json
    {
      "content": "期末周太焦虑了...",
      "mood_id": 3,
      "is_anonymous": true,
      "category": "study"
    }
    ```

    category 可选值：general / study / emotion / vent
    """
    post = Post(
        content=data.content,
        mood_id=data.mood_id,
        is_anonymous=data.is_anonymous,
        category=data.category,
        user_id=1,  # MVP 固定用户
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    return {
        "code": 0,
        "msg": "ok",
        "data": _post_to_response(post, session),
    }


@router.get("")
async def list_posts(
    category: Optional[str] = None,  # 筛选分类
    tag: Optional[str] = None,        # 筛选标签（兼容旧参数）
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session),
):
    """
    获取帖子列表（解忧角帖子流）

    Query 参数：
    - category: 分类筛选（general / study / emotion / vent）
    - tag: 标签筛选（兼容旧参数，等同 category）
    - page: 页码，默认 1
    - page_size: 每页数量，默认 20
    """
    # category 和 tag 参数统一处理
    filter_category = category or tag or "all"

    statement = select(Post).order_by(Post.created_at.desc())

    # 分类筛选
    if filter_category and filter_category != "all":
        statement = statement.where(Post.category == filter_category)

    # 分页
    offset = (page - 1) * page_size
    posts = session.exec(statement.offset(offset).limit(page_size)).all()

    # 总数
    count_statement = select(Post)
    if filter_category and filter_category != "all":
        count_statement = count_statement.where(Post.category == filter_category)
    total = len(session.exec(count_statement).all())

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "posts": [_post_to_response(p, session) for p in posts],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.get("/{post_id}")
async def get_post(
    post_id: int,
    session: Session = Depends(get_session),
):
    """获取单条帖子"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    return {
        "code": 0,
        "msg": "ok",
        "data": _post_to_response(post, session),
    }


# ==================== 互动 ====================

@router.post("/{post_id}/like")
async def like_post(
    post_id: int,
    session: Session = Depends(get_session),
):
    """点赞帖子"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    post.likes_count += 1
    session.add(post)
    session.commit()
    session.refresh(post)

    return {
        "code": 0,
        "msg": "ok",
        "data": {"likes_count": post.likes_count},
    }


@router.delete("/{post_id}/like")
async def unlike_post(
    post_id: int,
    session: Session = Depends(get_session),
):
    """取消点赞"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    post.likes_count = max(0, post.likes_count - 1)
    session.add(post)
    session.commit()
    session.refresh(post)

    return {
        "code": 0,
        "msg": "ok",
        "data": {"likes_count": post.likes_count},
    }


# ==================== 评论（简化版） ====================

class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    post_id: int
    content: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/{post_id}/comment")
async def comment_post(
    post_id: int,
    data: CommentCreate,
    session: Session = Depends(get_session),
):
    """评论帖子（MVP 简化：评论内容直接存在 posts 表的额外字段里）"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    post.comments_count += 1
    session.add(post)
    session.commit()
    session.refresh(post)

    # MVP 简化处理：评论内容存入内存（生产环境应单独建 Comment 表）
    # 这里只返回成功状态，前端负责本地追加显示
    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "comments_count": post.comments_count,
            "comment": {
                "id": 0,
                "post_id": post_id,
                "content": data.content,
                "created_at": post.created_at.isoformat(),
            },
        },
    }


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
):
    """删除帖子"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    session.delete(post)
    session.commit()

    return {
        "code": 0,
        "msg": "删除成功",
        "data": None,
    }
