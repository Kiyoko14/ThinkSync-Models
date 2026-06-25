# RLS Deployment Analysis — ThinkSync Models

## Phase VPS-05

---

## Executive Summary

**The backend does NOT use Supabase Auth.** It connects directly to PostgreSQL via
`pg` pool (using `DATABASE_URL`). Therefore:

- **RLS policies are bypassed** when using the service role connection
- The RLS policies in `schema.sql` only matter if you use Supabase's REST API directly
  (e.g. from frontend with anon key)

**Verdict:** RLS is **not a deployment blocker** for the backend. It is a safety net for
direct Supabase REST API access.

---

## Architecture

```
Frontend (React)
    │
    │  (Supabase REST API — anon key)
    ▼
Supabase PostgREST
    │
    │  (RLS policies evaluated HERE)
    ▼
PostgreSQL
    │
    │  (direct pg connection — RLS bypassed)
    ▼
ThinkSync API Server (Node.js)
    │
    ├── DATABASE_URL=postgresql://postgres.xxx:***@aws-1.pooler.supabase.com:5432/postgres
    └── Uses `pg` pool with service role → RLS bypassed
```

---

## What the RLS Policies Do

In `schema.sql` (lines 378-390):

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- ... (8 tables total)

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (
  (current_setting('request.jwt.claim.sub', true))::text = id::text
  OR (current_setting('request.jwt.claims', true))::jsonb ->> 'role' = 'service_role'
  OR (current_setting('request.jwt.claims', true))::jsonb ->> 'role' = 'admin'
);
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
```

These policies:
1. Allow service role to do anything (`USING (true)`)
2. Allow users to read their own data (via JWT `sub` claim)
3. Allow admin role to read any data

---

## Is This Safe for Production?

### If using Supabase REST API directly from frontend:

⚠️ **`current_setting('request.jwt.claim.sub')` may not work** with custom JWTs.
Supabase expects JWTs signed by Supabase Auth. If you use custom JWTs, you need to:

1. Set `supabase.auth.jwt_secret` to your custom JWT secret, OR
2. Use Supabase Auth to issue JWTs, OR
3. Disable RLS and handle auth in application code (what this backend does)

### If using only the ThinkSync API server (recommended):

✅ **Safe.** The API server connects with service role → RLS bypassed → auth handled
in Express middleware (`middlewares/auth.ts`, `middlewares/auth-api-key.ts`).

---

## Recommended Production Configuration

### Option A: Use ThinkSync API only (recommended)

1. Keep `DATABASE_URL` as service role connection
2. Disable RLS on all tables (or leave as-is; doesn't matter)
3. Handle auth in Express middleware (already implemented)
4. Don't expose Supabase anon key to frontend

### Option B: Use Supabase REST API from frontend (not recommended for this project)

1. Use Supabase Auth (not custom JWT)
2. Keep RLS policies as-is
3. Frontend talks to Supabase directly for real-time/subscriptions
4. API server still used for custom logic

---

## Changes Made in This Phase

`RLS policies` in `schema.sql` updated to use `current_setting('request.jwt.claim.sub')`
instead of `auth.uid()`:

- `auth.uid()` → only works with Supabase Auth
- `current_setting('request.jwt.claim.sub')` → works with both Supabase Auth and custom JWTs
  (if Supabase is configured to pass JWT claims to PG)

This is a **defense-in-depth** change. The primary security mechanism is the Express
middleware, not RLS.

---

## Verification

```sql
-- Check if RLS is enabled on users table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'users';

-- Should return true (RLS enabled) but doesn't matter for service role connections

-- Verify service role bypasses RLS
-- Connect as service role and try to read users table:
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
-- Should work (service role bypasses RLS)
```

---

## Conclusion

**RLS is not a deployment blocker.** The ThinkSync API server uses direct PostgreSQL
connections with service role privileges, which bypass RLS entirely. The RLS policies
in `schema.sql` are a safety net for direct Supabase REST API access, not the primary
security mechanism.

**Deployment blocker status: ✅ NONE (RLS is safe)**
