# Korisu — Деплой на Render

## Шаг 1. Генерация JWT ключей (один раз)

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Скопируй содержимое этих файлов — они понадобятся на Render.

## Шаг 2. Пуш на GitHub

Создай репозиторий на GitHub и запушь папку korisu:

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR/korisu.git
git push -u origin main
```

**Важно:** НЕ добавляй private.pem и public.pem в репозиторий (они в .gitignore).

## Шаг 3. Деплой на Render

1. Зайди на render.com → New → Blueprint
2. Подключи GitHub репозиторий
3. Render найдёт render.yaml и создаст все сервисы автоматически

## Шаг 4. Переменные окружения (обязательно)

В Render Dashboard → korisu-api → Environment:

| Переменная | Значение |
|---|---|
| `JWT_PRIVATE_KEY` | Содержимое private.pem (весь текст включая BEGIN/END) |
| `JWT_PUBLIC_KEY` | Содержимое public.pem (весь текст включая BEGIN/END) |

В korisu-chat → Environment:

| Переменная | Значение |
|---|---|
| `JWT_PUBLIC_KEY` | Содержимое public.pem (тот же что выше) |

В korisu-conference → Environment:

| Переменная | Значение |
|---|---|
| `JWT_PUBLIC_KEY` | Содержимое public.pem |

## Шаг 5. Применить миграцию базы данных

После того как сервисы поднялись, применяем схему БД.

В Render Dashboard → korisu-api → Shell:
```bash
cd services/api_gateway
python3 -c "
import asyncio
from database import engine, Base
from models import *
asyncio.run(engine.begin().__aenter__())
"
```

Или через psql (строку подключения возьми из Render → korisu-db → Info):
```bash
psql "postgresql://korisu:PASSWORD@HOST/korisu_db" < migrations/001_init.sql
```

## Шаг 6. Регистрация аккаунта без SendGrid

Если SendGrid не настроен — после регистрации ссылка верификации будет в логах:

Render → korisu-api → Logs → ищи строку:
```
[KORISU] Verification link for your@email.com: https://...
```

Открой эту ссылку и аккаунт будет верифицирован.

Или верифицируй через Shell в korisu-api:
```bash
cd services/api_gateway
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def verify():
    url = os.environ['DATABASE_URL'].replace('postgresql://', 'postgresql+asyncpg://')
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        await conn.execute(text(\"UPDATE auth.users SET verified=true WHERE email='your@email.com'\"))
    await engine.dispose()

asyncio.run(verify())
"
```

## Шаг 7. LiveKit (для видеозвонков)

1. Зарегистрируйся на cloud.livekit.io (бесплатный план)
2. Создай проект → скопируй URL, API Key, API Secret
3. Добавь в Render для korisu-api и korisu-conference:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
4. Добавь в korisu-frontend:
   - `VITE_LIVEKIT_URL` — тот же URL

## URLs после деплоя

- Frontend: https://korisu-frontend.onrender.com
- API: https://korisu-api.onrender.com
- Chat: https://korisu-chat.onrender.com
- Conference: https://korisu-conference.onrender.com

## Важные заметки

- Бесплатный план Render засыпает после 15 мин неактивности. Первый запрос после сна ждёт ~30 сек.
- Redis на бесплатном плане имеет лимит 25MB.
- База данных на бесплатном плане доступна 90 дней, потом удаляется (можно продлить).
