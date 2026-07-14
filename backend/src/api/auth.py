"""
用户认证 API 路由

提供：
- POST /api/auth/email-code  发送邮箱验证码
- POST /api/auth/register    注册（邮箱验证码 + 密码）
- POST /api/auth/login       密码登录（返回 JWT）
- POST /api/auth/login/code  邮箱验证码登录（返回 JWT）
- GET  /api/auth/me          获取当前用户信息
"""

import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.hash import bcrypt, pbkdf2_sha256
from sqlmodel import Session, select

from src.core.models import (
    EmailCodeLogin,
    EmailCodeRequest,
    EmailVerificationCode,
    JWT_ALGORITHM,
    JWT_EXPIRE_DAYS,
    JWT_SECRET_KEY,
    TokenData,
    User,
    UserCreate,
    UserLogin,
    UserUpdate,
)
from src.db.database import get_session
from src.services.email_service import EmailServiceError, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

# OAuth2 方案（从请求中提取 token）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
EMAIL_CODE_EXPIRE_MINUTES = 5
EMAIL_CODE_RESEND_SECONDS = 60
EMAIL_CODE_MAX_ATTEMPTS = 5


# ==================== JWT 工具函数 ====================

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


def create_access_token(user_id: int) -> str:
    """签发 JWT token。"""
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "exp": int(expire.timestamp()),
    }
    return encode_access_token(to_encode)


# ==================== 认证工具函数 ====================

def verify_password(plain: str, hashed: str) -> bool:
    """校验密码。"""
    try:
        if hashed.startswith("$pbkdf2-sha256$"):
            return pbkdf2_sha256.verify(plain, hashed)
        return bcrypt.verify(plain, hashed)
    except Exception:
        return False


def hash_password(password: str) -> str:
    """哈希密码。"""
    return pbkdf2_sha256.hash(password)


def normalize_email(email: str) -> str:
    value = (email or "").strip().lower()
    if not EMAIL_RE.match(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请输入有效的邮箱地址",
        )
    return value


def normalize_purpose(purpose: str) -> str:
    value = (purpose or "").strip().lower()
    if value not in {"register", "login"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码用途无效",
        )
    return value


def hash_email_code(email: str, purpose: str, code: str) -> str:
    message = f"{email}:{purpose}:{code}".encode("utf-8")
    return hmac.new(JWT_SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def create_email_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def latest_code_query(email: str, purpose: str):
    return (
        select(EmailVerificationCode)
        .where(EmailVerificationCode.email == email)
        .where(EmailVerificationCode.purpose == purpose)
        .where(EmailVerificationCode.consumed_at == None)  # noqa: E711
        .order_by(EmailVerificationCode.created_at.desc())
    )


def consume_email_code(session: Session, email: str, purpose: str, code: str) -> None:
    verification = session.exec(latest_code_query(email, purpose)).first()
    now = datetime.utcnow()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先获取邮箱验证码",
        )

    if verification.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码已过期，请重新获取",
        )

    if verification.attempts >= EMAIL_CODE_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误次数过多，请重新获取",
        )

    expected_hash = hash_email_code(email, purpose, code.strip())
    if not hmac.compare_digest(verification.code_hash, expected_hash):
        verification.attempts += 1
        session.add(verification)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误",
        )

    verification.consumed_at = now
    session.add(verification)
    session.commit()


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "mbti": user.mbti,
        "avatar_character": user.avatar_character,
        "zodiac": user.zodiac,
        "email_verified": user.email_verified,
        "email_verified_at": user.email_verified_at.isoformat() if user.email_verified_at else None,
        "created_at": user.created_at.isoformat(),
    }


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """从 JWT token 获取当前用户（依赖注入）。"""
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

@router.post("/email-code", response_model=dict)
async def send_email_code(
    data: EmailCodeRequest,
    session: Session = Depends(get_session),
):
    """
    发送邮箱验证码。
    """
    email = normalize_email(data.email)
    purpose = normalize_purpose(data.purpose)
    existing_user = session.exec(select(User).where(User.email == email)).first()

    if purpose == "register" and existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册，请直接登录",
        )
    if purpose == "login" and not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱还没有注册，请先创建账号",
        )

    latest = session.exec(latest_code_query(email, purpose)).first()
    now = datetime.utcnow()
    if latest and (now - latest.last_sent_at).total_seconds() < EMAIL_CODE_RESEND_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="验证码发送太频繁，请稍后再试",
        )

    code = create_email_code()
    try:
        send_verification_email(email, code, purpose)
    except EmailServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    verification = EmailVerificationCode(
        email=email,
        purpose=purpose,
        code_hash=hash_email_code(email, purpose, code),
        expires_at=now + timedelta(minutes=EMAIL_CODE_EXPIRE_MINUTES),
        created_at=now,
        last_sent_at=now,
    )
    session.add(verification)
    session.commit()

    return {
        "code": 0,
        "msg": "验证码已发送，请查收邮箱",
        "data": {
            "email": email,
            "expires_in": EMAIL_CODE_EXPIRE_MINUTES * 60,
        },
    }


@router.post("/register", response_model=dict)
async def register(
    data: UserCreate,
    session: Session = Depends(get_session),
):
    """
    用户注册：邮箱验证码 + 密码。
    """
    data.email = normalize_email(data.email)
    data.username = data.username.strip()
    if not data.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请输入用户名",
        )
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码至少 6 位",
        )
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="两次输入的密码不一致",
        )

    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册",
        )

    consume_email_code(session, data.email, "register", data.code)

    now = datetime.utcnow()
    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        email_verified=True,
        email_verified_at=now,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id)

    return {
        "code": 0,
        "msg": "注册成功",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user(user),
        },
    }


@router.post("/login", response_model=dict)
async def login(
    data: UserLogin,
    session: Session = Depends(get_session),
):
    """
    用户密码登录。
    """
    data.email = normalize_email(data.email)
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
            "user": serialize_user(user),
        },
    }


@router.post("/login/code", response_model=dict)
async def login_with_email_code(
    data: EmailCodeLogin,
    session: Session = Depends(get_session),
):
    """
    用户邮箱验证码登录，仅允许已注册邮箱登录。
    """
    email = normalize_email(data.email)
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="该邮箱还没有注册，请先创建账号",
        )

    consume_email_code(session, email, "login", data.code)
    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

    token = create_access_token(user.id)

    return {
        "code": 0,
        "msg": "登录成功",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user(user),
        },
    }


@router.post("/forgot-password", response_model=dict)
async def forgot_password():
    """
    忘记密码（占位接口）。
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
    获取当前登录用户信息。
    """
    return {
        "code": 0,
        "msg": "ok",
        "data": serialize_user(current_user),
    }


@router.patch("/me", response_model=dict)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    更新当前用户信息。
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
        "data": serialize_user(current_user),
    }
