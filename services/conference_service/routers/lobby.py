import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import redis.asyncio as aioredis

from database import get_db
from config import settings
from livekit_service import create_guest_token, create_host_token, end_room, kick_participant

router = APIRouter()

LOBBY_TTL = 7200       # 2 hours
APPROVE_LOCK_TTL = 5   # 5 sec distributed lock


def _redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis


def _auth_ws(token: str) -> dict | None:
    from jose import jwt, JWTError
    try:
        return jwt.decode(token, settings.get_public_key(), algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


# ── Guest requests to join ────────────────────────────────────

@router.post("/{meeting_id}/request")
async def lobby_request(
    meeting_id: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    """Guest sends join request. Stored in Redis lobby queue."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")

    payload = _auth_ws(token)
    if not payload:
        raise HTTPException(401, "Invalid token")

    user_id = payload["user_id"]
    email = payload.get("email", "")

    guest_data = json.dumps({
        "user_id": user_id,
        "email": email,
        "name": email.split("@")[0],
        "status": "waiting",
        "requested_at": datetime.now(timezone.utc).isoformat(),
    })

    lobby_key = f"lobby:{meeting_id}:queue"
    await redis.hset(lobby_key, user_id, guest_data)
    await redis.expire(lobby_key, LOBBY_TTL)

    # Notify host via pub/sub
    await redis.publish(
        f"lobby:{meeting_id}:events",
        json.dumps({"type": "guest_request", "user_id": user_id, "email": email}),
    )

    return {"status": "waiting"}


@router.get("/{meeting_id}/status")
async def lobby_status(
    meeting_id: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    """Guest polls their status. Returns token if approved."""
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    user_id = payload["user_id"]
    raw = await redis.hget(f"lobby:{meeting_id}:queue", user_id)
    if not raw:
        raise HTTPException(404, "Not in lobby")

    data = json.loads(raw)
    if data["status"] == "approved":
        lk_token = create_guest_token(meeting_id, user_id, data.get("name", user_id))
        return {"status": "approved", "livekit_token": lk_token}

    if data["status"] == "rejected":
        return {"status": "rejected"}

    return {"status": "waiting"}


@router.post("/{meeting_id}/approve/{user_id}")
async def approve_guest(
    meeting_id: str,
    user_id: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    """Host approves a guest. Race-condition safe with Redis lock."""
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    # Distributed lock to prevent double-approve
    lock_key = f"lobby_approve:{meeting_id}:{user_id}"
    acquired = await redis.set(lock_key, "1", ex=APPROVE_LOCK_TTL, nx=True)
    if not acquired:
        return {"status": "already_approved"}

    raw = await redis.hget(f"lobby:{meeting_id}:queue", user_id)
    if not raw:
        raise HTTPException(404, "Guest not in lobby")

    data = json.loads(raw)
    data["status"] = "approved"
    await redis.hset(f"lobby:{meeting_id}:queue", user_id, json.dumps(data))

    # Notify guest
    await redis.publish(
        f"lobby:{meeting_id}:guest:{user_id}",
        json.dumps({"type": "approved"}),
    )

    # DB update — write participant
    await redis.publish(
        f"lobby:{meeting_id}:events",
        json.dumps({"type": "guest_approved", "user_id": user_id}),
    )

    return {"status": "approved"}


@router.post("/{meeting_id}/reject/{user_id}")
async def reject_guest(
    meeting_id: str,
    user_id: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    raw = await redis.hget(f"lobby:{meeting_id}:queue", user_id)
    if not raw:
        raise HTTPException(404, "Guest not in lobby")

    data = json.loads(raw)
    data["status"] = "rejected"
    await redis.hset(f"lobby:{meeting_id}:queue", user_id, json.dumps(data))

    await redis.publish(
        f"lobby:{meeting_id}:guest:{user_id}",
        json.dumps({"type": "rejected"}),
    )

    return {"status": "rejected"}


@router.get("/{meeting_id}/guests")
async def get_lobby_guests(
    meeting_id: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    """Host fetches all waiting guests."""
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    all_guests = await redis.hgetall(f"lobby:{meeting_id}:queue")
    waiting = []
    for uid, raw in all_guests.items():
        data = json.loads(raw)
        if data["status"] == "waiting":
            waiting.append(data)

    return waiting


@router.post("/{meeting_id}/end")
async def end_meeting(
    meeting_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(_redis),
):
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    # Notify all participants
    await redis.publish(
        f"lobby:{meeting_id}:events",
        json.dumps({"type": "meeting_ended"}),
    )

    # Update DB
    from sqlalchemy import text
    async with db as session:
        await session.execute(
            text("UPDATE meetings.meetings SET status='ended', ended_at=NOW() WHERE id=:id"),
            {"id": meeting_id},
        )
        await session.commit()

    # End LiveKit room
    await end_room(meeting_id)

    # Cleanup lobby queue
    await redis.delete(f"lobby:{meeting_id}:queue")

    return {"ok": True}


@router.post("/{meeting_id}/kick/{identity}")
async def kick_from_meeting(
    meeting_id: str,
    identity: str,
    request: Request,
    redis: aioredis.Redis = Depends(_redis),
):
    token = request.cookies.get("access_token")
    payload = _auth_ws(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    await kick_participant(meeting_id, identity)
    return {"ok": True}


# ── WebSocket for real-time lobby events ──────────────────────

@router.websocket("/{meeting_id}/ws")
async def lobby_websocket(
    websocket: WebSocket,
    meeting_id: str,
):
    """WebSocket for host to receive real-time lobby events."""
    await websocket.accept()

    # Auth via first message
    try:
        auth_msg = await websocket.receive_json()
        token = auth_msg.get("token", "")
        payload = _auth_ws(token)
        if not payload:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    redis_sub = await aioredis.from_url(
        settings.REDIS_URL, encoding="utf-8", decode_responses=True
    )
    pubsub = redis_sub.pubsub()
    await pubsub.subscribe(f"lobby:{meeting_id}:events")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe()
        await redis_sub.close()
