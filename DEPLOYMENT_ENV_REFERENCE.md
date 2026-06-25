# Deployment Environment Reference — ThinkSync Models

> **Copy `.env.example` to `.env` and fill in every variable below.**  
> Missing required variables will cause `pnpm start` to exit with an error.

---

## Required (startup fails if missing)

| Variable | Description | Example | Default |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL/Supabase connection string | `postgresql://postgres.xxx:password@aws-1.pooler.supabase.com:5432/postgres` | *(none — required)* |
| `JWT_SECRET` | Secret for signing JWT tokens (generate: `openssl rand -hex 32`) | `a1b2c3d4e5f6...` | *(none — required)* |
| `SILICONFLOW_API_KEY` | SiliconFlow AI provider API key | `sk-abc123...` | *(none — required)* |
| `PORT` | HTTP listen port | `3000` | *(none — crashes if missing)* |

---

## Recommended (bots won't start without them)

| Variable | Description | Example |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Admin Telegram bot token (from @BotFather) | `123456:ABC-DEF...` |
| `TELEGRAM_USER_BOT_TOKEN` | User Telegram bot token (from @BotFather) | `123456:ABC-DEF...` |

---

## Optional (have defaults)

| Variable | Description | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | Environment mode | `development` | Set to `production` on VPS |
| `THINKSYNC_PROVIDER` | AI provider base URL | `https://api.siliconflow.com/v1` | Override for custom provider |
| `SUPABASE_URL` | Supabase project URL (for screenshot storage) | *(none)* | Required only if using payment screenshots |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | *(none)* | Required only if using payment screenshots |
| `SUPABASE_ANON_KEY` | Supabase anon key (fallback) | *(none)* | Rarely needed |
| `THINKSYNC_API_URL` | API base URL (for bot messages) | `https://api.thinksync.art` | Used in Telegram bot replies |
| `THINKSYNC_WEBSITE_URL` | Website URL (for bot messages) | `https://models.thinksync.art` | Used in Telegram bot replies |
| `ADMIN_EMAIL` | Primary admin email (auto-created if user doesn't exist) | `admin@thinksync.ai` | Used at first startup |
| `ADMIN_PASSWORD_HASH` | Primary admin password hash (bcrypt) | *(none)* | Generate: `python3 -c "import bcrypt; print(bcrypt.hashpw('pw'.encode(), bcrypt.gensalt()).decode())"` |
| `PRIMARY_ADMIN_EMAIL` | Owner admin email (cannot be changed after setup) | *(none)* | Used in `services/admin.ts` |
| `PRIMARY_ADMIN_TELEGRAM_ID` | Owner admin Telegram ID | *(none)* | Used in `services/admin.ts` |
| `PROVIDER_TIMEOUT_MS` | AI provider request timeout | `30000` | Increase for slower models |
| `PROVIDER_MAX_RETRIES` | AI provider request retry count | `3` | |
| `LOG_LEVEL` | Pino log level | `info` | Options: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

---

## In `.env.example` but NOT validated at startup

| Variable | Status | Reason |
|---|---|---|
| `ADMIN_EMAIL` | ⚠️ Not in `validateEnvironment()` | Only used at runtime in `services/user.ts` |
| `ADMIN_PASSWORD_HASH` | ⚠️ Not in `validateEnvironment()` | Same as above |
| `THINKSYNC_PROVIDER` | ⚠️ Not in `validateEnvironment()` | Has a default; provider still works |
| `SUPABASE_URL` | ⚠️ Not in `validateEnvironment()` | Optional; screenshots disabled if missing |
| `SUPABASE_SERVICE_KEY` | ⚠️ Not in `validateEnvironment()` | Same as above |
| `CORS_ORIGINS` | ❌ **Dead config** | `app.ts` uses `cors()` (open CORS); this var does nothing |

---

## Removed (were in old `.env.example`, now cleaned up)

~~`ADMIN_TELEGRAM_BOT_TOKEN`~~ → renamed to `TELEGRAM_BOT_TOKEN`  
~~`USER_TELEGRAM_BOT_TOKEN`~~ → renamed to `TELEGRAM_USER_BOT_TOKEN`

---

## Full `.env.example` (cleaned)

```bash
# ThinkSync Models Environment Variables
# Copy this file to .env and fill in your values

# =============================================================================
# DATABASE (Required)
# =============================================================================
DATABASE_URL=postgresql://postgres.your-project.supabase.co:***@gmail.com

# =============================================================================
# AUTHENTICATION
# =============================================================================
# Generate with: openssl rand -hex 32
JWT_SECRET=your-32-character-hex-secret-here

# Primary admin email (auto-created at first startup if doesn't exist)
ADMIN_EMAIL=admin@thinksync.art
ADMIN_PASSWORD_HASH= (generate with: python3 -c "import bcrypt; print(bcrypt.hashpw('your-password'.encode(), bcrypt.gensalt()).decode())")

# Primary admin (owner) - cannot be changed after setup
PRIMARY_ADMIN_EMAIL=admin@thinksync.art
PRIMARY_ADMIN_TELEGRAM_ID=

# =============================================================================
# SILICONFLOW AI PROVIDER (Required for chat completions)
# =============================================================================
SILICONFLOW_API_KEY=sk-you...here
THINKSYNC_PROVIDER=https://api.siliconflow.com/v1

# =============================================================================
# SERVER CONFIG
# =============================================================================
PORT=3000
NODE_ENV=production

# =============================================================================
# SUPABASE (for payment screenshot storage)
# =============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# =============================================================================
# TELEGRAM BOTS
# =============================================================================
TELEGRAM_BOT_TOKEN=your-admin-bot-token-here
TELEGRAM_USER_BOT_TOKEN=your-user-bot-token-here

# =============================================================================
# THINKSYNC URLS
# =============================================================================
THINKSYNC_API_URL=https://api.thinksync.art
THINKSYNC_WEBSITE_URL=https://models.thinksync.art

# =============================================================================
# PROVIDER SETTINGS
# =============================================================================
PROVIDER_TIMEOUT_MS=30000
PROVIDER_MAX_RETRIES=3

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
```

---

## CORS Note

`CORS_ORIGINS` is listed in the current `.env.example` but **is not implemented**.  
`app.ts` line 30: `app.use(cors());` — this allows **all origins**.

To fix: replace `app.use(cors())` with:
```ts
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
```

Until then, `CORS_ORIGINS` in `.env.example` is dead config and should be removed or annotated.
