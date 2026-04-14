import asyncio
import json
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text, select
from sqlalchemy.orm import DeclarativeBase
from pydantic_settings import BaseSettings
from jose import jwt, JWTError
import redis.asyncio as aioredis


# ── Config ────────────────────────────────────────────────────

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_PUBLIC_KEY_FILE: str = "/run/secrets/public.pem"
    JWT_ALGORITHM: str = "RS256"
    FRONTEND_URL: str = "http://localhost:5173"
    WORKER_ID: str = str(uuid.uuid4())

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_public_key(self) -> str:
        import os
        if os.path.exists(self.JWT_PUBLIC_KEY_FILE):
            with open(self.JWT_PUBLIC_KEY_FILE) as f:
                return f.read()
        key = os.environ.get("JWT_PUBLIC_KEY", "")
        if key:
            return key.replace("\\n", "\n")
        raise ValueError("JWT public key not found. Set JWT_PUBLIC_KEY env var.")

settings = Settings()


# ── DB ────────────────────────────────────────────────────────

db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Auth ──────────────────────────────────────────────────────

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.get_public_key(), algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


# ── Connection Manager ────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        self.connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.connections.pop(user_id, None)

    async def send_to(self, user_id: str, data: dict) -> bool:
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
                return True
            except Exception:
                self.disconnect(user_id)
        return False


manager = ConnectionManager()


# ── App ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await aioredis.from_url(
        settings.REDIS_URL, encoding="utf-8", decode_responses=True
    )
    # Subscribe to this worker's channel
    asyncio.create_task(worker_subscriber(app.state.redis))
    yield
    await app.state.redis.close()


app = FastAPI(title="Korisu Chat Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def worker_subscriber(redis: aioredis.Redis):
    """Listen on this worker's pub/sub channel and forward to local WS connections."""
    sub_redis = await aioredis.from_url(
        settings.REDIS_URL, encoding="utf-8", decode_responses=True
    )
    pubsub = sub_redis.pubsub()
    await pubsub.subscribe(f"worker:{settings.WORKER_ID}:messages")

    async for message in pubsub.listen():
        if message["type"] == "message":
            try:
                payload = json.loads(message["data"])
                user_id = payload.get("recipient_id")
                if user_id:
                    await manager.send_to(user_id, payload)
            except Exception:
                pass


# ── WebSocket ─────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Auth via first message
    try:
        auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        token = auth_msg.get("token", "")
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except (asyncio.TimeoutError, Exception):
        await websocket.close(code=4001, reason="Auth timeout")
        return

    user_id = payload["user_id"]
    redis: aioredis.Redis = app.state.redis

    # Register connection
    await manager.connect(user_id, websocket)
    await redis.setex(f"user:{user_id}:online", 600, "1")
    await redis.set(f"user:{user_id}:worker_id", settings.WORKER_ID)

    # Heartbeat + message loop
    async def heartbeat():
        while True:
            await asyncio.sleep(270)
            try:
                await websocket.send_json({"type": "ping"})
                await redis.setex(f"user:{user_id}:online", 600, "1")
            except Exception:
                break

    hb_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "pong":
                await redis.setex(f"user:{user_id}:online", 600, "1")

            elif msg_type == "message":
                await handle_message(user_id, data, redis)

            elif msg_type == "mark_read":
                await handle_mark_read(user_id, data, redis)

            elif msg_type == "typing":
                await handle_typing(user_id, data, redis)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hb_task.cancel()
        manager.disconnect(user_id)
        await redis.delete(f"user:{user_id}:online")
        await redis.delete(f"user:{user_id}:worker_id")

        async with AsyncSessionLocal() as db:
            await db.execute(
                text("UPDATE auth.users SET last_seen_at=NOW() WHERE id=:id"),
                {"id": user_id},
            )
            await db.commit()


async def handle_message(sender_id: str, data: dict, redis: aioredis.Redis):
    conversation_id = data.get("conversation_id")
    content = data.get("content", "").strip()

    if not content or len(content) > 4000:
        return

    if not conversation_id:
        return

    # Persist message
    async with AsyncSessionLocal() as db:
        # Verify sender is in conversation
        result = await db.execute(
            text("""
                SELECT cp.user_id FROM chat.conversation_participants cp
                WHERE cp.conversation_id = :conv_id AND cp.user_id = :user_id
            """),
            {"conv_id": conversation_id, "user_id": sender_id},
        )
        if not result.scalar_one_or_none():
            return

        msg_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO chat.messages (id, conversation_id, sender_id, content, status)
                VALUES (:id, :conv_id, :sender_id, :content, 'sent')
            """),
            {"id": msg_id, "conv_id": conversation_id, "sender_id": sender_id, "content": content},
        )

        # Update conversation updated_at
        await db.execute(
            text("UPDATE chat.conversations SET updated_at=NOW() WHERE id=:id"),
            {"id": conversation_id},
        )

        # Get recipient
        result = await db.execute(
            text("""
                SELECT user_id FROM chat.conversation_participants
                WHERE conversation_id = :conv_id AND user_id != :sender
            """),
            {"conv_id": conversation_id, "sender": sender_id},
        )
        recipient_id = result.scalar_one_or_none()
        await db.commit()

    if not recipient_id:
        return

    message_payload = {
        "type": "message",
        "id": msg_id,
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent",
        "recipient_id": str(recipient_id),
    }

    # Try local delivery first
    delivered = await manager.send_to(str(recipient_id), message_payload)

    if not delivered:
        # Route via Redis Pub/Sub to the correct worker
        worker_id = await redis.get(f"user:{recipient_id}:worker_id")
        if worker_id:
            await redis.publish(f"worker:{worker_id}:messages", json.dumps(message_payload))


async def handle_mark_read(user_id: str, data: dict, redis: aioredis.Redis):
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return

    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE chat.conversation_participants
                SET last_read_at = NOW()
                WHERE conversation_id = :conv_id AND user_id = :user_id
            """),
            {"conv_id": conversation_id, "user_id": user_id},
        )
        await db.execute(
            text("""
                UPDATE chat.messages SET status = 'read'
                WHERE conversation_id = :conv_id AND sender_id != :user_id AND status != 'read'
            """),
            {"conv_id": conversation_id, "user_id": user_id},
        )
        await db.commit()


async def handle_typing(user_id: str, data: dict, redis: aioredis.Redis):
    conversation_id = data.get("conversation_id")
    is_typing = data.get("is_typing", False)
    if not conversation_id:
        return

    # Notify the other participant
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT user_id FROM chat.conversation_participants
                WHERE conversation_id = :conv_id AND user_id != :sender
            """),
            {"conv_id": conversation_id, "sender": user_id},
        )
        recipient_id = result.scalar_one_or_none()

    if recipient_id:
        payload = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "recipient_id": str(recipient_id),
        }
        delivered = await manager.send_to(str(recipient_id), payload)
        if not delivered:
            worker_id = await redis.get(f"user:{recipient_id}:worker_id")
            if worker_id:
                await redis.publish(f"worker:{worker_id}:messages", json.dumps(payload))


# ── REST endpoints ────────────────────────────────────────────

@app.get("/health")
async def health():
    try:
        await app.state.redis.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {"status": "healthy" if redis_ok else "degraded", "checks": {"redis": "ok" if redis_ok else "error"}}


@app.get("/chats")
async def list_chats(request: Request):
    token = request.cookies.get("access_token")
    payload = decode_token(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    user_id = payload["user_id"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT
                    c.id as conv_id,
                    u.id as partner_id,
                    u.name as partner_name,
                    u.avatar_url as partner_avatar,
                    u.email as partner_email,
                    m.content as last_message,
                    m.created_at as last_message_at,
                    m.sender_id as last_sender_id,
                    cp_me.last_read_at,
                    (
                        SELECT COUNT(*) FROM chat.messages msg2
                        WHERE msg2.conversation_id = c.id
                        AND msg2.sender_id != :user_id
                        AND (cp_me.last_read_at IS NULL OR msg2.created_at > cp_me.last_read_at)
                        AND msg2.deleted_at IS NULL
                    ) as unread_count
                FROM chat.conversations c
                JOIN chat.conversation_participants cp_me ON cp_me.conversation_id = c.id AND cp_me.user_id = :user_id
                JOIN chat.conversation_participants cp_other ON cp_other.conversation_id = c.id AND cp_other.user_id != :user_id
                JOIN auth.users u ON u.id = cp_other.user_id
                LEFT JOIN LATERAL (
                    SELECT content, created_at, sender_id FROM chat.messages
                    WHERE conversation_id = c.id AND deleted_at IS NULL
                    ORDER BY created_at DESC LIMIT 1
                ) m ON true
                ORDER BY COALESCE(m.created_at, c.created_at) DESC
            """),
            {"user_id": user_id},
        )
        rows = result.mappings().all()

    return [
        {
            "conversation_id": str(row["conv_id"]),
            "partner": {
                "id": str(row["partner_id"]),
                "name": row["partner_name"],
                "avatar_url": row["partner_avatar"],
                "email": row["partner_email"],
            },
            "last_message": row["last_message"],
            "last_message_at": row["last_message_at"].isoformat() if row["last_message_at"] else None,
            "unread_count": row["unread_count"],
        }
        for row in rows
    ]


@app.get("/chats/{contact_id}/messages")
async def get_messages(contact_id: str, request: Request, limit: int = 50, before: str | None = None):
    token = request.cookies.get("access_token")
    payload = decode_token(token) if token else None
    if not payload:
        raise HTTPException(401, "Not authenticated")

    user_id = payload["user_id"]

    async with AsyncSessionLocal() as db:
        # Get or create conversation
        result = await db.execute(
            text("""
                SELECT c.id FROM chat.conversations c
                JOIN chat.conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = :user_id
                JOIN chat.conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = :contact_id
            """),
            {"user_id": user_id, "contact_id": contact_id},
        )
        conv_id = result.scalar_one_or_none()

        if not conv_id:
            # Create new conversation
            conv_id = str(uuid.uuid4())
            await db.execute(
                text("INSERT INTO chat.conversations (id) VALUES (:id)"),
                {"id": conv_id},
            )
            await db.execute(
                text("INSERT INTO chat.conversation_participants (conversation_id, user_id) VALUES (:conv_id, :u1), (:conv_id, :u2)"),
                {"conv_id": conv_id, "u1": user_id, "u2": contact_id},
            )
            await db.commit()
            return {"conversation_id": str(conv_id), "messages": []}

        # Fetch messages
        query_params: dict = {"conv_id": str(conv_id), "limit": limit}
        before_clause = ""
        if before:
            before_clause = "AND m.created_at < :before"
            query_params["before"] = before

        result = await db.execute(
            text(f"""
                SELECT m.id, m.sender_id, m.content, m.status, m.created_at
                FROM chat.messages m
                WHERE m.conversation_id = :conv_id AND m.deleted_at IS NULL
                {before_clause}
                ORDER BY m.created_at DESC
                LIMIT :limit
            """),
            query_params,
        )
        messages = result.mappings().all()

    return {
        "conversation_id": str(conv_id),
        "messages": [
            {
                "id": str(m["id"]),
                "sender_id": str(m["sender_id"]),
                "content": m["content"],
                "status": m["status"],
                "created_at": m["created_at"].isoformat(),
            }
            for m in reversed(messages)
        ],
    }
