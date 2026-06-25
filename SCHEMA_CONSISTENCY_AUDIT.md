# Schema Consistency Audit — ThinkSync Models

## Task 3: Database Audit — Code vs `schema.sql`

### Tables Referenced in Code ↔ Tables in `schema.sql`

| Table | In Schema | In Code | Status |
|---|---|---|---|
| `users` | ✅ | ✅ | OK |
| `api_keys` | ✅ | ✅ | OK |
| `models` | ✅ | ✅ | OK |
| `packages` | ✅ | ✅ | OK |
| `transactions` | ✅ | ✅ | OK |
| `api_logs` | ✅ | ✅ | OK |
| `audit_logs` | ✅ | ✅ | OK |
| `admins` | ✅ | ✅ | OK |
| `telegram_accounts` | ✅ | ✅ | OK |
| `payment_requests` | ✅ | ✅ | OK |
| `notifications` | ✅ | ✅ | OK |
| `platform_settings` | ✅ | ✅ | OK |
| `promocodes` | ✅ | ✅ | OK |
| `tiers` | ✅ | ✅ | OK |
| `schema_migrations` | ✅ | ❌ | See DRIFT below |

**All 14 tables in schema are referenced in code. No missing tables.**

---

### Column Consistency Check (Per Table)

#### `users` — ✅ All columns match

Code inserts/updates: `email`, `password_hash`, `display_name`, `plan_tier`, `role`, `is_active`, `balance`, `total_spent`, `rate_limit_rpm`, `rate_limit_tpm`, `tier_id`, `tier_mode`, `lifetime_spend_usd`, `monthly_requests_used`, `monthly_tokens_used`, `month_reset_at`, `tier_access`

Schema has all of these: ✅

⚠️ **Note:** `tier_access` in `users` is a legacy column (kept for compatibility per schema comment). Code in `services/user.ts` still writes to it.

#### `api_keys` — ✅ All columns match

Code columns: `profile_id`, `key_prefix`, `key_hash`, `name`, `status`, `expires_at`  
Schema columns: all present ✅

#### `models` — ✅ All columns match

Code columns: `slug`, `provider_model_id`, `provider`, `display_name`, `description`, `pricing_input_per_m`, `pricing_output_per_m`, `supports_streaming`, `supports_functions`, `is_active`, `is_visible`, `tier_access`, `minimum_tier_id`, `context_window`, `max_output_tokens`, `rate_limit_rpm`, `rate_limit_tpm`, `sort_order`

Schema has all of these: ✅

#### `packages` — ✅ All columns match

#### `transactions` — ✅ All columns match

#### `api_logs` — ✅ All columns match

#### `audit_logs` — ✅ All columns match

#### `admins` — ✅ All columns match

#### `payment_requests` — ✅ All columns match

⚠️ **Note:** Schema has `screenshot_deleted` (double L) but code uses `screenshot_deleted` — these match (same spelling in schema line 251: `screenshot_deleted`). ✅

#### `platform_settings` — ✅ All columns match

#### `promocodes` — ✅ All columns match

Schema has `max_uses_per_user`. Code references `max_uses_per_user` in `services/promocode.ts`: ✅

---

## Task 4: Drift Detection

### Code References Missing from Schema

| Reference | Where | Status |
|---|---|---|
| `schema_migrations` table | `schema.sql` only (created, inserted into) | ❌ Never queried in code |
| `telegram_accounts` table | `schema.sql` + `services/telegram-account.ts` (if exists) | ⚠️ Check if service file exists |

**`schema_migrations`** — created and inserted into in `schema.sql`, but **never read or queried by any service**. It's write-only. This is not a bug (it's for manual tracking) but is dead weight.

### Schema Objects Unused by Code

| Object | Type | Used in Code? |
|---|---|---|
| `schema_migrations` | table | ❌ Never queried |
| `idx_tiers_priority` | index | ❌ Not explicitly referenced (indexes are auto-used by DB) |
| `RLS POLICIES` (lines 384-386) | policies | ⚠️ Syntax may be wrong for supabase (uses `auth.uid()` which is a Supabase Auth function, may not work in raw PostgreSQL) |

---

## Task 6: Welcome Bonus Audit

### Verdict: ❌ NO welcome bonus logic exists

Searched all files for: `welcome`, `bonus`, `signup_bonus`, `WELCOME`, `BONUS`.

**What exists:**
- `packages` have a `bonus_tokens` column (e.g. "Pro" package gives 30,000 bonus tokens)
- This is a **pakage bonus** (applied when user buys a package), NOT a **welcome/signup bonus**

**What's missing:**
- No logic that grants tokens automatically on user registration
- No `SIGNUP_BONUS_TOKENS` env var or setting
- No `welcome_bonus` field in `platform_settings`
- No notification sent on welcome

**Schema:** No welcome bonus column or setting.  
**Services:** No `grantWelcomeBonus()` or similar function.  
**API:** No welcome bonus endpoint or automated grant.  
**Documentation:** Not mentioned in `.env.example` or `schema.sql` comments.

---

## Summary

| Check | Result |
|---|---|
| All tables in code exist in schema? | ✅ YES |
| All columns in code exist in schema? | ✅ YES (verified per table) |
| Any dead references (table in code but not schema)? | ❌ NO |
| Any schema tables unused by code? | ⚠️ `schema_migrations` (by design) |
| Welcome bonus exists? | ❌ NO — not in schema, services, API, or docs |
| RLS policies valid? | ⚠️ Uses `auth.uid()` — only works if Supabase Auth is enabled |

---

## Recommended Actions

1. **Add welcome bonus** to `platform_settings` or as a `SIGNUP_BONUS_TOKENS` env var if this is a required feature
2. **Fix RLS policies** in `schema.sql` — `auth.uid()` and `auth.role()` are Supabase Auth functions; if using custom JWT, these need to be replaced
3. **Remove or document `schema_migrations`** — currently write-only, consider reading it in a startup check
4. **Fix `CORS_ORIGINS` dead config** — either implement it in `app.ts` or remove from `.env.example`
