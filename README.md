# KORISU — Video Conferencing Platform

Modern, minimal video conferencing built on LiveKit, FastAPI, React, and Redis.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| API Gateway | FastAPI (Python 3.12) — Auth, Meetings, Contacts |
| Chat Service | FastAPI + WebSocket — Real-time messaging via Redis Pub/Sub |
| Conference Service | FastAPI — LiveKit token management, lobby |
| Database | PostgreSQL 16 |
| Cache / Broker | Redis 7 (Upstash in production) |
| Video | LiveKit Cloud (free tier → self-hosted) |
| Deploy | Render.com |

---

## Local Development

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone and configure

```bash
git clone https://github.com/youruser/korisu.git
cd korisu
cp .env.example .env
# Edit .env with your values
```

### 2. Generate RS256 keys

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Copy contents into .env JWT_PRIVATE_KEY and JWT_PUBLIC_KEY
```

### 3. Get LiveKit credentials

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a project → Settings → API Keys → Generate Key
3. Copy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` to `.env`

### 4. Start with Docker Compose

```bash
docker compose up --build
```

Services start at:
- Frontend: http://localhost:5173
- API Gateway: http://localhost:8000
- Chat Service: http://localhost:8001
- Conference Service: http://localhost:8002

### 5. Run DB migrations

```bash
docker compose exec api_gateway bash
alembic upgrade head
# Or run the SQL directly:
# psql $DATABASE_URL -f /migrations/001_init.sql
```

---

## Deploy to Render

### Step 1 — Push to GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/youruser/korisu.git
git push -u origin main
```

### Step 2 — Create Render Blueprint

1. Go to [render.com](https://render.com) → New → Blueprint
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates all services automatically

### Step 3 — Set Secret Environment Variables

In Render Dashboard, for each service set these secrets:

**korisu-api, korisu-chat, korisu-conference:**
- `JWT_PRIVATE_KEY` — your RSA private key
- `JWT_PUBLIC_KEY` — your RSA public key

**korisu-api only:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SENDGRID_API_KEY`

**korisu-api + korisu-conference:**
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_SECRET_ENCRYPTION_KEY` — run `openssl rand -hex 32`

### Step 4 — Run migrations

```bash
# In Render Dashboard → korisu-api → Shell
python -c "
import asyncio
from database import engine, Base
asyncio.run(engine.begin().__aenter__().__anext__().run_sync(Base.metadata.create_all))
"
# Or connect to your Render PostgreSQL and run migrations/001_init.sql
```

### Step 5 — Configure Google OAuth

In [Google Cloud Console](https://console.cloud.google.com):
1. APIs & Services → Credentials → OAuth 2.0 Client
2. Add Authorized redirect URI: `https://korisu-api.onrender.com/auth/google/callback`

### Step 6 — Custom Domain (optional)

Render Dashboard → korisu-frontend → Custom Domains → Add `korisu.online`

---

## Switching to Self-Hosted LiveKit

When ready to move from LiveKit Cloud to self-hosted:

```bash
# Deploy LiveKit server (Docker)
docker run --rm \
  -p 7880:7880 -p 7881:7881 \
  -p 7882:7882/udp \
  -v $PWD/livekit.yaml:/livekit.yaml \
  livekit/livekit-server \
  --config /livekit.yaml

# livekit.yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  your-api-key: your-api-secret
```

Update env vars:
```
LIVEKIT_URL=wss://your-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

---

## Upstash Redis (Production)

For production Redis with Render free tier Redis being limited (25MB):

1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database → copy `REDIS_URL`
3. Set in Render env vars: `REDIS_URL=rediss://...`

---

## Architecture

```
Browser
  │
  ├── HTTPS ──► Render Static (React frontend)
  │
  ├── /auth/* ──► korisu-api (FastAPI :8000)
  │                  ├── PostgreSQL (users, meetings, contacts)
  │                  └── Redis (JWT blacklist, rate limiting, sessions)
  │
  ├── /meetings/* ──► korisu-api → korisu-conference (:8002)
  │                                   ├── LiveKit Admin API (create rooms)
  │                                   ├── Redis (lobby queue, locks)
  │                                   └── PostgreSQL (meeting records)
  │
  ├── /ws ──► korisu-chat (FastAPI + WebSocket :8001)
  │             ├── Redis Pub/Sub (cross-worker message routing)
  │             └── PostgreSQL (messages, conversations)
  │
  └── WebRTC ──► LiveKit Cloud SFU
                   (video/audio media streams)
```

---

## Security

- **JWT RS256** — asymmetric signing, private key only in API Gateway
- **httpOnly cookies** — JS cannot read tokens (XSS protection)
- **SameSite=Strict** — CSRF protection
- **bcrypt rounds=12** — password hashing
- **AES-256-GCM** — LiveKit secret encryption at rest
- **Token family rotation** — refresh token theft detection
- **Rate limiting** — 5 login attempts per 15 min per IP via Redis
- **Redis blacklist** — immediate token revocation on logout

---

## License

MIT
