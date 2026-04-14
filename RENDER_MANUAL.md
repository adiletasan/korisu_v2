# Ручной деплой на Render — пошагово

## Настройки для каждого сервиса

### korisu-api
- Language: Python
- Root Directory: services/api_gateway
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
- Plan: Free

Переменные окружения:
| Key | Value |
|-----|-------|
| PYTHON_VERSION | 3.11.9 |
| DATABASE_URL | (из Render PostgreSQL) |
| REDIS_URL | rediss://default:...@...upstash.io:6379 | redis-cli --tls -u redis://default:gQAAAAAAAQr3AAIncDE3MDVkNTIwZGQwNDQ0YjNiYmY0Yjk3ZDgxZGU4MDgwNnAxNjgzNDM@moral-lizard-68343.upstash.io:6379
| JWT_PRIVATE_KEY | (содержимое private.pem) |
| JWT_PUBLIC_KEY | (содержимое public.pem) |
| FRONTEND_URL | https://korisu-frontend.onrender.com |
| API_URL | https://korisu-api.onrender.com |
| CHAT_SERVICE_URL | https://korisu-chat.onrender.com |
| CONFERENCE_SERVICE_URL | https://korisu-conference.onrender.com |
| LIVEKIT_URL | wss://... |
| LIVEKIT_API_KEY | API... |
| LIVEKIT_API_SECRET | ... |

---

### korisu-chat
- Language: Python
- Root Directory: services/chat_service
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
- Plan: Free

Переменные окружения:
| Key | Value |
|-----|-------|
| PYTHON_VERSION | 3.11.9 |
| DATABASE_URL | (из Render PostgreSQL) |
| REDIS_URL | rediss://default:...@...upstash.io:6379 |
| JWT_PUBLIC_KEY | (содержимое public.pem) |
| FRONTEND_URL | https://korisu-frontend.onrender.com |

---

### korisu-conference
- Language: Python
- Root Directory: services/conference_service
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
- Plan: Free

Переменные окружения:
| Key | Value |
|-----|-------|
| PYTHON_VERSION | 3.11.9 |
| DATABASE_URL | (из Render PostgreSQL) |
| REDIS_URL | rediss://default:...@...upstash.io:6379 |
| JWT_PUBLIC_KEY | (содержимое public.pem) |
| FRONTEND_URL | https://korisu-frontend.onrender.com |
| LIVEKIT_URL | wss://... |
| LIVEKIT_API_KEY | API... |
| LIVEKIT_API_SECRET | ... |

---

### korisu-frontend
- Language: Static Site
- Build Command: cd frontend && npm install && npm run build
- Publish Directory: frontend/dist
- Plan: Free

Переменные окружения:
| Key | Value |
|-----|-------|
| VITE_API_URL | https://korisu-api.onrender.com |
| VITE_LIVEKIT_URL | wss://... |

---

### PostgreSQL (создать отдельно)
Render → New → PostgreSQL
- Name: korisu-db
- Plan: Free
- Database: korisu_db
- User: korisu

Скопируй Internal Database URL → вставь как DATABASE_URL во все сервисы.

---

## После деплоя — применить миграцию

Render → korisu-api → Shell:

python3 -c "
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def migrate():
    url = os.environ['DATABASE_URL'].replace('postgresql://', 'postgresql+asyncpg://')
    engine = create_async_engine(url)
    sql = open('../../migrations/001_init.sql').read()
    async with engine.begin() as conn:
        for stmt in sql.split(';'):
            stmt = stmt.strip()
            if stmt:
                try:
                    await conn.execute(text(stmt))
                except Exception as e:
                    print(f'Skip: {e}')
    await engine.dispose()
    print('Done!')

asyncio.run(migrate())
"
