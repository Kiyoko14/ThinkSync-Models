# Startup Validation Audit — ThinkSync Models

## Phase VPS-05

---

## Classification of All `process.env` Variables

### Required (startup fails with exit code 1 if missing)

| Variable | Used In | Validation |
|---|---|---|
| `DATABASE_URL` | `db/index.ts` | ✅ Checked in `validateEnvironment()` |
| `JWT_SECRET` | `middlewares/auth.ts` | ✅ Checked in `validateEnvironment()` |
| `SILICONFLOW_API_KEY` | `services/provider/siliconflow.ts` | ✅ Checked in `validateEnvironment()` |
| `PORT` | `index.ts` | ✅ Checked in `validateEnvironment()` |

### Recommended (warned at startup, not fatal)

| Variable | Used In | Validation |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `bot/admin-bot.ts` | ✅ Listed in `validateEnvironment()` (recommended) |
| `TELEGRAM_USER_BOT_TOKEN` | `bot/user-bot.ts` | ✅ Listed in `validateEnvironment()` (recommended) |

### Optional (logged as "using default" if missing)

| Variable | Default | Validation |
|---|---|---|
| `ADMIN_EMAIL` | `"admin@thinksync.ai"` | ✅ Now listed in `validateEnvironment()` (optional) |
| `ADMIN_PASSWORD_HASH` | `undefined` (warns and skips) | ✅ Now listed |
| `THINKSYNC_PROVIDER` | `"https://api.siliconflow.com/v1"` | ✅ Now listed |
| `SUPABASE_URL` | `undefined` (screenshots disabled) | ✅ Now listed |
| `SUPABASE_SERVICE_KEY` | `undefined` | ✅ Now listed |
| `SUPABASE_ANON_KEY` | `undefined` | ✅ Now listed |
| `THINKSYNC_API_URL` | `"https://api.thinksync.art"` | ✅ Now listed |
| `THINKSYNC_WEBSITE_URL` | `"https://models.thinksync.art"` | ✅ Now listed |
| `CORS_ORIGINS` | `[]` (open CORS) | ✅ Now listed + implemented in `app.ts` |
| `NODE_ENV` | `"development"` | ✅ Now listed |
| `LOG_LEVEL` | `"info"` | ✅ Now listed |
| `PROVIDER_TIMEOUT_MS` | `30000` | ✅ Now listed |
| `PROVIDER_MAX_RETRIES` | `3` | ✅ Now listed |
| `PRIMARY_ADMIN_EMAIL` | `undefined` | ✅ Now listed |
| `PRIMARY_ADMIN_TELEGRAM_ID` | `undefined` | ✅ Now listed |

---

## Startup Validation Flow (`index.ts`)

```
1. validateEnvironment() runs
2. Results classified:
   - required → fatal if missing (exit code 1)
   - recommended → warning logged
   - optional → "using default" logged
3. criticalFailures = results.filter(r => !r.valid)
4. If criticalFailures.length > 0 → print errors, process.exit(1)
5. Server starts
```

---

## Gaps Found and Fixed

| Gap | Before | After |
|---|---|---|
| `ADMIN_EMAIL` not validated | ❌ Missing from `validateEnvironment()` | ✅ Listed as optional |
| `ADMIN_PASSWORD_HASH` not validated | ❌ Missing | ✅ Listed as optional |
| `THINKSYNC_PROVIDER` not validated | ❌ Missing | ✅ Listed as optional |
| `CORS_ORIGINS` not implemented | ❌ Dead config (`app.ts` used `cors()` open) | ✅ Now reads `CORS_ORIGINS` and applies it |
| `TELEGRAM_ADMIN_BOT_TOKEN` wrong name | ❌ Used old name | ✅ Fixed to `TELEGRAM_BOT_TOKEN` |

---

## Verification

### Command

```bash
cd artifacts/api-server
# Missing required var → should fail
PORT=3000 DATABASE_URL=... JWT_SECRET=... SILICONFLOW_API_KEY=... node dist/index.mjs

# Missing PORT → should fail with "Invalid PORT value"
DATABASE_URL=... JWT_SECRET=... SILICONFLOW_API_KEY=... node dist/index.mjs
# Expected: "Invalid PORT value: "undefined"" then exit
```

### Expected output (all required vars present)

```
✅ Environment validation complete: 4 valid, 0 invalid
🚀 ThinkSync Models API
   Port: 3000
   Health: http://localhost:3000/health
   Ready:  http://localhost:3000/health/ready
```

---

## Remaining Notes

- **Bot entry points** (`bot/admin-bot.ts`, `bot/user-bot.ts`) are separate from `index.ts`
  and have their own startup. They don't run `validateEnvironment()`. This is acceptable
  because bot tokens are "recommended" not "required" — the API server can run without bots.

- **`ADMIN_PASSWORD_HASH` warning**: If not set, `seedAdminUser()` prints a warning and
  skips admin creation. This is by design (allows first-user-is-admin via registration).
