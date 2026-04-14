from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from config import settings
from database import engine, Base
from routers import lobby, internal, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await aioredis.from_url(
        settings.REDIS_URL, encoding="utf-8", decode_responses=True
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await app.state.redis.close()


app = FastAPI(title="Korisu Conference Service", version="1.0.0", lifespan=lifespan)

allowed_origins = [settings.FRONTEND_URL]
if settings.FRONTEND_URL != "http://localhost:5173":
    allowed_origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie"],
)

app.include_router(health.router)
app.include_router(lobby.router, prefix="/lobby", tags=["lobby"])
app.include_router(internal.router, prefix="/internal", tags=["internal"])
