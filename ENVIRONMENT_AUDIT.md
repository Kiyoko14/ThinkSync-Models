# Environment Variable Audit — ThinkSync Models

## Task 1: Code Usage of `process.env.*`

| Variable | Required | Default | File(s) | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | *(none)* | `db/index.ts` — PostgreSQL connection |
| `JWT_SECRET` | ✅ Yes | `"dev-secret-key-change-in-production"` | `middlewares/auth.ts`, `middlewares/auth-api-key.ts` — JWT signing |
| `SILICONFLOW_API_KEY` | ✅ Yes | *(none)* | `services/provider/siliconflow.ts`, `app.ts` (health check) |
| `THINKSYNC_PROVIDER` | No | `"https://api.siliconflow.com/v1"` | `services/provider/siliconflow.ts` — AI provider base URL |
| `PORT` | ✅ Yes | *(none — crashes if missing)* | `index.ts` — HTTP listen port |
| `NODE_ENV` | No | `"development"` | 12 files — toggles SSL, production logging, seed data suppression |
| `SUPABASE_URL` | No | *(none)* | `services/payment-request.ts` — screenshot storage |
| `SUPABASE_SERVICE_KEY` | No | *(none)* | `services/payment-request.ts` — Supabase admin client |
| `SUPABASE_ANON_KEY` | No | *(none)* | `services/payment-request.ts` — fallback for `SUPABASE_SERVICE_KEY` |
| `TELEGRAM_BOT_TOKEN` | No | *(none)* | `bot/admin-bot.ts` — Admin Telegram bot |
| `TELEGRAM_USER_BOT_TOKEN` | No | *(none)* | `bot/user-bot.ts` — User Telegram bot |
| `THINKSYNC_API_URL` | No | `"https://api.thinksync.art"` | `bot/user-bot.ts` — API URL for bot messages |
| `THINKSYNC_WEBSITE_URL` | No | `"https://models.thinksync.art"` | `bot/user-bot.ts` — Website URL for bot messages |
| `ADMIN_EMAIL` | No | `"admin@thinksync.ai"` | `services/user.ts` — auto-create primary admin |
| `ADMIN_PASSWORD_HASH` | No | *(none)* | `services/user.ts` — password for auto-created primary admin |
| `PRIMARY_ADMIN_EMAIL` | No | *(none)* | `services/admin.ts` — owner admin email |
| `PRIMARY_ADMIN_TELEGRAM_ID` | No | *(none)* | `services/admin.ts` — owner admin Telegram ID |
| `PROVIDER_TIMEOUT_MS` | No | `30000` | `services/provider/siliconflow.ts` — AI request timeout |
| `PROVIDER_MAX_RETRIES` | No | `3` | `services/provider/siliconflow.ts` — AI request retry count |
| `LOG_LEVEL` | No | `"info"` | `lib/logger.ts` — pino log level |

---

## Task 2: `.env.example` vs Code — Gaps Found

### ❌ In code but MISSING from `.env.example`

| Variable | Used In | Impact |
|---|---|---|
| `SUPABASE_ANON_KEY` | `services/payment-request.ts:34` | Falls back to `SUPABASE_SERVICE_KEY` if missing; not documented |
| `PRIMARY_ADMIN_EMAIL` | `services/admin.ts:313` | Owner admin email — not in `.env.example` |
| `PRIMARY_ADMIN_TELEGRAM_ID` | `services/admin.ts:314` | Owner admin Telegram ID — not in `.env.example` |
| `PROVIDER_TIMEOUT_MS` | `services/provider/siliconflow.ts:88` | AI provider timeout — not configurable via env |
| `PROVIDER_MAX_RETRIES` | `services/provider/siliconflow.ts:89` | AI provider retry count — not configurable via env |
| `LOG_LEVEL` | `lib/logger.ts:6` | Log level — not configurable via env |

### ❌ In `.env.example` but NOT validated in `index.ts`

| Variable | In `.env.example` | Validated in `validateEnvironment()` |
|---|---|---|
| `DATABASE_URL` | ✅ | ✅ Required |
| `JWT_SECRET` | ✅ | ✅ Required |
| `SILICONFLOW_API_KEY` | ✅ | ✅ Required |
| `PORT` | ✅ | ✅ Required |
| `ADMIN_EMAIL` | ✅ | ❌ NOT validated (only used at runtime) |
| `ADMIN_PASSWORD_HASH` | ✅ | ❌ NOT validated |
| `THINKSYNC_PROVIDER` | ✅ | ❌ NOT validated |
| `NODE_ENV` | ✅ | ❌ NOT validated (optional) |
| `SUPABASE_URL` | ✅ | ❌ NOT validated (optional) |
| `SUPABASE_SERVICE_KEY` | ✅ | ❌ NOT validated (optional) |
| `TELEGRAM_BOT_TOKEN` | ✅ | ⚠️ Listed as "recommended" but always shows "optional" in output |
| `TELEGRAM_USER_BOT_TOKEN` | ✅ | ⚠️ Same as above |
| `THINKSYNC_API_URL` | ✅ | ❌ NOT validated |
| `THINKSYNC_WEBSITE_URL` | ✅ | ❌ NOT validated |
| `CORS_ORIGINS` | ✅ | ❌ NOT validated — AND NOT USED IN CODE (`app.ts` calls `cors()` with no options) |

### 🔧 `CORS_ORIGINS` — Dead Config

`.env.example` documents `CORS_ORIGINS` but `app.ts` line 30 is:
```ts
app.use(cors());
```
This applies **open CORS** (allows all origins) and completely ignores `CORS_ORIGINS`. The variable is dead config — it does nothing.

---

## Task 7: Telegram Bot Environment Variables

| Variable | Bot | In `.env.example` | In `validateEnvironment()` | Status |
|---|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Admin Bot | ✅ | ⚠️ Listed as recommended but marked "optional" | ⚠️ |
| `TELEGRAM_USER_BOT_TOKEN` | User Bot | ✅ | ⚠️ Same | ⚠️ |

Both bots will crash at startup if their token is missing, but the validation in `index.ts` only marks them as "optional". The `bot/` entry points are separate from `index.ts`, so their validation is not run at all unless those entry points have their own validation (they don't).

---

## Summary of Gaps

1. **6 env vars missing from `.env.example`** — `PRIMARY_ADMIN_EMAIL`, `PRIMARY_ADMIN_TELEGRAM_ID`, `PROVIDER_TIMEOUT_MS`, `PROVIDER_MAX_RETRIES`, `LOG_LEVEL`, `SUPABASE_ANON_KEY`
2. **`CORS_ORIGINS` is dead config** — `app.ts` doesn't use it; `cors()` allows all origins
3. **`validateEnvironment()` in `index.ts` doesn't match `.env.example`** — `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `THINKSYNC_PROVIDER` are in `.env.example` but not in the validation required list
4. **Bot tokens not validated at startup** — separate entry points (`build.mjs` bundles them separately)
