import uuid
import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Request, HTTPException, status
from config import settings
import redis.asyncio as aioredis


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "jti": jti,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
    }
    token = jwt.encode(payload, settings.get_private_key(), algorithm=settings.JWT_ALGORITHM)
    return token, jti


def create_refresh_token() -> tuple[str, str]:
    raw = str(uuid.uuid4())
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.get_public_key(), algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(token)
    jti = payload.get("jti")

    redis_client: aioredis.Redis = request.app.state.redis
    if jti and await redis_client.exists(f"blacklist:{jti}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

    return payload


def _is_production() -> bool:
    """Detect if running on Render or other production environment."""
    return settings.FRONTEND_URL.startswith("https://")


def set_auth_cookies(response, access_token: str, refresh_token: str):
    production = _is_production()
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=production,
        samesite="none" if production else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=production,
        samesite="none" if production else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def clear_auth_cookies(response):
    production = _is_production()
    response.delete_cookie("access_token", samesite="none" if production else "lax", secure=production)
    response.delete_cookie("refresh_token", samesite="none" if production else "lax", secure=production)
