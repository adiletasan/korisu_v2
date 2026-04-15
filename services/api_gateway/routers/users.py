from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, UserSettings
from security import get_current_user
from schemas import UpdateSettingsRequest

router = APIRouter()


@router.get("/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "provider": user.provider,
        "verified": user.verified,
        "created_at": user.created_at.isoformat(),
    }


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user["user_id"])
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Settings not found")

    return {
        "email_notifications": s.email_notifications,
        "language": s.language,
        "theme": s.theme,
    }


@router.patch("/settings")
async def update_settings(
    body: UpdateSettingsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user["user_id"])
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Settings not found")

    if body.email_notifications is not None:
        s.email_notifications = body.email_notifications
    if body.language is not None:
        s.language = body.language
    if body.theme is not None:
        s.theme = body.theme

    await db.commit()
    return {"ok": True}


@router.post("/change-password")
async def change_password(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from security import hash_password, verify_password
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(400, "Cannot change password for OAuth accounts")

    if not verify_password(body.get("current_password", ""), user.password_hash):
        raise HTTPException(401, "INVALID_CREDENTIALS")

    new_pass = body.get("new_password", "")
    if len(new_pass) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")

    user.password_hash = hash_password(new_pass)
    await db.commit()
    return {"ok": True}


@router.get("/status/{user_id}")
async def get_user_status(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    redis = request.app.state.redis
    is_online = await redis.exists(f"user:{user_id}:online")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "user_id": user_id,
        "is_online": bool(is_online),
        "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }
