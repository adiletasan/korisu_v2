import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import redis.asyncio as aioredis

from database import get_db
from models import User, RefreshToken, UserSettings
from security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user
)
from config import settings
from schemas import RegisterRequest, LoginRequest
from email_service import send_verification_email

router = APIRouter()


async def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis


@router.get("/google")
async def google_login():
    redirect_uri = f"{settings.API_URL}/auth/google/callback"
    params = (
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid+email+profile"
        f"&access_type=offline"
        f"&state={uuid.uuid4()}"
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(
    code: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.API_URL}/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        g_token = token_resp.json().get("access_token")
        if not g_token:
            raise HTTPException(400, "Google OAuth failed")

        profile_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {g_token}"},
        )
        profile = profile_resp.json()

    email = profile.get("email")
    if not email:
        raise HTTPException(400, "GOOGLE_EMAIL_MISSING")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            name=profile.get("name", email.split("@")[0]),
            avatar_url=profile.get("picture"),
            provider="google",
            verified=True,
        )
        db.add(user)
        await db.flush()
        db.add(UserSettings(user_id=user.id))
        await db.commit()
        await db.refresh(user)

    return await _issue_tokens_and_redirect(user, request, response, redis, db)


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        provider="email",
        verified=False,
    )
    db.add(user)
    await db.flush()
    db.add(UserSettings(user_id=user.id))
    await db.commit()
    await db.refresh(user)

    token = str(uuid.uuid4())
    await redis.setex(f"verify:{token}", 86400, str(user.id))
    await send_verification_email(body.email, body.name, token)

    return {"message": "Please check your email to verify your account"}


@router.get("/verify")
async def verify_email(
    token: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    user_id = await redis.get(f"verify:{token}")
    if not user_id:
        raise HTTPException(400, "TOKEN_EXPIRED_OR_USED")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, "User not found")

    user.verified = True
    await db.commit()
    await redis.delete(f"verify:{token}")

    return await _issue_tokens_and_redirect(user, request, response, redis, db)


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    ip = request.client.host
    rate_key = f"rate:{ip}:auth"
    attempts = await redis.get(rate_key)
    if attempts and int(attempts) >= 5:
        raise HTTPException(429, "TOO_MANY_ATTEMPTS")

    pipe = redis.pipeline()
    pipe.incr(rate_key)
    pipe.expire(rate_key, 900)
    await pipe.execute()

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "INVALID_CREDENTIALS")
    if not user.verified:
        raise HTTPException(403, "EMAIL_NOT_VERIFIED")
    if not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "INVALID_CREDENTIALS")

    return await _issue_tokens_and_redirect(user, request, response, redis, db, redirect=False)


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(401, "No refresh token")

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(401, "Invalid or expired refresh token")

    rt.revoked = True
    await db.commit()

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")

    access_token, jti = create_access_token(str(user.id), user.email, user.role)
    new_raw, new_hash = create_refresh_token()

    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        family_id=rt.family_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(new_rt)
    await db.commit()

    set_auth_cookies(response, access_token, new_raw)
    return {"ok": True}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    redis: aioredis.Redis = Depends(get_redis),
):
    # Try to read token from cookie even if expired
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = decode_token(token)
            if payload:
                jti = payload.get("jti")
                exp = payload.get("exp")
                if jti and exp:
                    ttl = int(exp - datetime.now(timezone.utc).timestamp())
                    if ttl > 0:
                        await redis.setex(f"blacklist:{jti}", ttl, "1")
                user_id = payload.get("user_id")
                if user_id:
                    await redis.delete(f"user:{user_id}:online")
                    await redis.delete(f"user:{user_id}:worker_id")
        except Exception:
            pass

    clear_auth_cookies(response)
    return {"ok": True}


@router.post("/resend-verification")
async def resend_verification(
    body: dict,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    email = body.get("email", "")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or user.verified:
        return {"message": "If your email exists and is unverified, you will receive a link"}

    token = str(uuid.uuid4())
    await redis.setex(f"verify:{token}", 86400, str(user.id))
    await send_verification_email(email, user.name, token)
    return {"message": "Verification email sent"}


async def _issue_tokens_and_redirect(user, request, response, redis, db, redirect=True):
    access_token, jti = create_access_token(str(user.id), user.email, user.role)
    raw_refresh, refresh_hash = create_refresh_token()

    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(rt)
    await db.commit()

    await redis.setex(f"user:{user.id}:online", 600, "1")

    if redirect:
        # Google OAuth: redirect to frontend, set cookies on the redirect response
        # Use a special page that reads cookies and redirects to dashboard
        resp = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback",
            status_code=302
        )
    else:
        resp = JSONResponse({
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
            }
        })

    set_auth_cookies(resp, access_token, raw_refresh)
    return resp


@router.get("/token")
async def get_ws_token(current_user: dict = Depends(get_current_user)):
    """Return access token for WebSocket auth"""
    from fastapi import Response
    from fastapi.responses import JSONResponse
    from jose import jwt
    from config import settings
    import uuid
    from datetime import datetime, timedelta, timezone

    access_token, _ = create_access_token(
        current_user["user_id"],
        current_user["email"],
        current_user["role"]
    )
    return {"token": access_token}
