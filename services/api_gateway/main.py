from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from database import engine, Base
from config import settings
from routers import auth, users, meetings, contacts, health, lobby_proxy, chat_proxy

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await app.state.redis.close()

app = FastAPI(
    title="Korisu API Gateway",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# Allow both localhost (dev) and production frontend
allowed_origins = [settings.FRONTEND_URL]
if settings.FRONTEND_URL != "http://localhost:5173":
    allowed_origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(meetings.router, prefix="/meetings", tags=["meetings"])
app.include_router(chat_proxy.router, prefix="/chats", tags=["chat"])
app.include_router(lobby_proxy.router, prefix="/lobby", tags=["lobby"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
