# ThinkSync Models

**AI API Gateway and Billing Platform** — built on top of SiliconFlow.

## Architecture

```
Client                    ThinkSync Gateway                SiliconFlow
  │                            │                              │
  │  POST /v1/chat/completions │                              │
  │  Authorization: Bearer ***  │                              │
  │ ──────────────────────────>│                              │
  │                            │  POST /v1/chat/completions   │
  │                            │  Authorization: Bearer sk-*  │
  │                            │ ────────────────────────────>│
  │                            │                              │
  │                            │  <── streaming/non-stream ───│
  │  <── streaming/non-stream ──│                              │
  │                            │                              │
  │                            │  ┌─ Usage → api_logs (DB)    │
  │                            │  └─ Rate limit → Redis       │
```

## Phase 1 — Core Backend

- **FastAPI** application with async SQLAlchemy 2.0
- **PostgreSQL** via Supabase (SQLite for dev)
- **Redis** rate limiting (sliding window, per-user RPM/TPM)
- **JWT** (Supabase Auth) + API key (bcrypt-hashed `thc_*` keys)
- **SiliconFlow** provider with pluggable `ProviderInterface`
- **OpenAI-compatible** chat completions API
- **Usage tracking** per request (tokens, cost, duration)
- **Production deployment** (systemd, nginx)

## Getting Started

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys and settings
```

### Run (development)

```bash
uvicorn app.main:app --reload --port 8000
```

### Run (production)

```bash
./scripts/start.sh
```

### Database migrations

```bash
# Auto-generate migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Test

```bash
./scripts/run_tests.sh
# Or directly:
python -m pytest tests/ -v --tb=short
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/v1/models` | None | List all models |
| GET | `/v1/models/{id}` | None | Get model details |
| POST | `/v1/chat/completions` | API key | Chat completion (OpenAI-compatible) |
| GET | `/v1/user/profile` | API key / JWT | Get user profile |
| GET | `/v1/user/tokens` | API key / JWT | List API keys |
| POST | `/v1/user/tokens/generate` | API key / JWT | Create API key |
| POST | `/v1/user/tokens/{id}/revoke` | API key / JWT | Revoke API key |
| POST | `/v1/user/tokens/{id}/rotate` | API key / JWT | Rotate API key |
| GET | `/v1/user/stats` | API key / JWT | Usage statistics |

### Chat Completion Request

```json
{
  "model": "thinking-faster1",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

## Project Structure

```
backend/
├── app/
│   ├── api/v1/           # API route handlers
│   │   ├── health.py     # GET /health
│   │   ├── models.py     # GET /v1/models
│   │   ├── chat.py       # POST /v1/chat/completions
│   │   └── user.py       # User + API key management
│   ├── core/             # Config, DB, security, logging, errors, rate limiter
│   ├── database/         # SQLAlchemy engine and session
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic v2 request/response schemas
│   ├── services/         # Business logic
│   │   ├── providers/    # AI provider adapters
│   │   │   └── __init__.py  # SiliconFlow provider
│   │   ├── api_keys.py   # API key CRUD
│   │   ├── profile.py    # User profile service
│   │   ├── provider.py   # ProviderInterface + registry
│   │   └── usage.py      # Usage logging
│   ├── middleware/        # Error handling, request ID, timing
│   ├── dependencies/      # FastAPI dependencies (auth, rate limit)
│   └── main.py           # FastAPI application
├── alembic/              # Database migrations
├── tests/                # pytest test suite
│   ├── test_auth/        # Authentication tests
│   ├── test_api/         # API endpoint tests
│   └── test_services/    # Service layer tests
├── scripts/              # Deployment scripts
│   ├── start.sh          # Production startup
│   ├── run_tests.sh      # Test runner with coverage
│   ├── thinksync.service # systemd unit
│   └── thinksync.nginx.conf  # Nginx configuration
├── alembic.ini           # Alembic configuration
├── requirements.txt      # Python dependencies
└── .env.example          # Environment template
```

## Database Tables (Phase 1)

- **profiles** — User profiles synced from Supabase Auth
- **models** — AI models available through the gateway (with pricing)
- **api_keys** — bcrypt-hashed `thc_*` API keys
- **api_logs** — Per-request usage tracking (tokens, cost, duration)

## Deployment

### Systemd

```bash
sudo cp scripts/thinksync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now thinksync
```

### Nginx

```bash
sudo cp scripts/thinksync.nginx.conf /etc/nginx/sites-available/thinksync
sudo ln -s /etc/nginx/sites-available/thinksync /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```