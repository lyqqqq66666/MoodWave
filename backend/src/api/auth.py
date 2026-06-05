"""
用户认证 API 路由

提供：
- POST /api/auth/register  注册
- POST /api/auth/login     登录（返回 JWT）
- GET  /api/auth/me        获取当前用户信息
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from passlib.hash import bcrypt, pbkdf2_sha256

from src.core.models import (
    User, UserCreate, UserLogin, Token, TokenData, UserResponse, UserUpdate,
    JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_DAYS,
)
from src.db.database import get_session

router = APIRouter(prefix="/auth", tags=["auth"])

# OAuth2 方案（从请求中提取 token）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ==================== 工具函数 ====================

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}".encode("utf-8"))


def _jwt_sign(message: bytes) -> str:
    signature = hmac.new(
        JWT_SECRET_KEY.encode("utf-8"),
        message,
        hashlib.sha256,
    ).digest()
    return _b64url_encode(signature)


def encode_access_token(payload: dict) -> str:
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    return f"{header_b64}.{payload_b64}.{_jwt_sign(signing_input)}"


def decode_access_token(token: str) -> dict:
    try:
        header_b64, payload_b64, signature = token.split(".")
    except ValueError as exc:
        raise ValueError("invalid token format") from exc

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_signature = _jwt_sign(signing_input)
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("invalid token signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("invalid token payload") from exc

    exp = payload.get("exp")
    if exp is None or int(exp) < int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("token expired")

    return payload


def verify_password(plain: str, hashed: str) -> bool:
    """校验密码"""
    try:
        if hashed.startswith("$pbkdf2-sha256$"):
            return pbkdf2_sha256.verify(plain, hashed)
        return bcrypt.verify(plain, hashed)
    except Exception:
        return False


def hash_password(password: str) -> str:
    """哈希密码"""
    return pbkdf2_sha256.hash(password)


def create_access_token(user_id: int) -> str:
    """签发 JWT token"""
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "exp": int(expire.timestamp()),
    }
    return encode_access_token(to_encode)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """从 JWT token 获取当前用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id_str))
    except (ValueError, TypeError):
        raise credentials_exception

    user = session.get(User, token_data.user_id)
    if user is None:
        raise credentials_exception
    return user


# ==================== 接口 ====================

@router.post("/register", response_model=dict)
async def register(
    data: UserCreate,
    session: Session = Depends(get_session),
):
    """
    用户注册

    请求体：
    ```json
    {
      "email": "user@example.com",
      "username": "小明",
      "password": "password123"
    }
    ```
    """
    # 检查邮箱是否已存在
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册",
        )

    # 创建用户
    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # 签发 token
    token = create_access_token(user.id)

    return {
        "code": 0,
        "msg": "注册成功",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "mbti": user.mbti,
                "avatar_character": user.avatar_character,
                "zodiac": user.zodiac,
                "created_at": user.created_at.isoformat(),
            },
        },
    }


@router.post("/login", response_model=dict)
async def login(
    data: UserLogin,
    session: Session = Depends(get_session),
):
    """
    用户登录

    请求体：
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
    """
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
        )

    token = create_access_token(user.id)

    return {
        "code": 0,
        "msg": "登录成功",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "mbti": user.mbti,
                "avatar_character": user.avatar_character,
                "zodiac": user.zodiac,
                "created_at": user.created_at.isoformat(),
            },
        },
    }


@router.post("/forgot-password", response_model=dict)
async def forgot_password():
    """
    忘记密码（占位接口）

    功能开发中，前端可先对接，返回友好提示。
    """
    return {
        "code": 0,
        "msg": "该功能正在开发中，敬请期待",
        "data": None,
    }


@router.get("/me", response_model=dict)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    获取当前登录用户信息

    需要在请求 header 中携带：
    Authorization: Bearer <token>
    """
    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "avatar_url": current_user.avatar_url,
            "mbti": current_user.mbti,
            "avatar_character": current_user.avatar_character,
            "zodiac": current_user.zodiac,
            "created_at": current_user.created_at.isoformat(),
        },
    }


@router.patch("/me", response_model=dict)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    更新当前用户信息

    可更新字段：username, avatar_url, mbti, avatar_character, zodiac
    只传需要修改的字段即可。
    """
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {
        "code": 0,
        "msg": "ok",
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "avatar_url": current_user.avatar_url,
            "mbti": current_user.mbti,
            "avatar_character": current_user.avatar_character,
            "zodiac": current_user.zodiac,
            "created_at": current_user.created_at.isoformat(),
        },
    }
