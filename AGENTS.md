# ThinkSync Models — Agent Instructions

**Project Root:** `/root/hermes-agent/ThinkSync-Models`  
**Current Phase:** 5C.8 (Platform Settings API)  
**Last Updated:** 2025-01-18

---

## 🚫 DO NOT READ BY DEFAULT

The following files are **archived** and should NOT be automatically injected into task context:

```
archive/
archive/PHASE*_REPORT.md
archive/PHASE*_AUDIT.md
archive/PHASE*_DISCOVERY.md
archive/PHASE3*.md
archive/PHASE4*.md
archive/replit.md
```

**Rule:** Only read these files when a task explicitly references them.

---

## ✅ READ BY DEFAULT (Minimal Set)

Only these files should be automatically injected:

| File | Purpose |
|------|---------|
| `AGENTS.md` | These instructions |
| `PROJECT_STATE.md` | Current project summary (CREATE THIS) |

**Rule:** All other context comes from live code, not markdown files.

---

## 📖 READ ON REQUEST

These reference documents can be used when specifically needed:

| File | When to Use |
|------|-------------|
| `BACKEND_STATE_AUDIT.md` | Backend architecture questions |
| `ADMIN_CAPABILITY_GAP_AUDIT.md` | Admin feature gaps |
| `PRODUCTION_RESILIENCE_AUDIT.md` | Reliability/timeout issues |
| `FRONTEND_DATA_SOURCE_AUDIT.md` | Frontend data sources |
| `TOKEN_USAGE_AUDIT.md` | Context/token optimization |

---

## 🎯 CONTEXT HYGIENE RULES

1. **DO NOT** read all `.md` files in project directory
2. **DO NOT** read files from `archive/` unless requested
3. **DO NOT** read source code through markdown files — read source directly
4. **USE** `session_search` to find past session info instead of re-reading reports
5. **CREATE** `PROJECT_STATE.md` as single source of truth
6. **ARCHIVE** completed phase reports to `archive/`

---

## 📁 PROJECT CONTEXT RULES

### Current Working Directory
```
/root/hermes-agent/ThinkSync-Models
```

### Always Verify
```bash
pwd  # Must show /root/hermes-agent/ThinkSync-Models
```

---

## 🔧 QUICK REFERENCE

### Code Locations
- Backend: `artifacts/api-server/src/`
- Frontend: `artifacts/thinksync/src/`
- Database: `artifacts/api-server/db/schema.sql`
- Services: `artifacts/api-server/src/services/`
- Bots: `artifacts/api-server/src/bot/`
- Systemd: `systemd/*.service`

### Database
```
postgresql://postgres.mlqcatnjvagkgdwaaezx@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```

### Key Services
- User management: `services/user.ts`
- API Keys: `services/api-key.ts`
- Billing: `services/billing.ts`
- Payment Requests: `services/payment-request.ts`
- Platform Settings: `services/platform-settings.ts`
- Models: `services/model.ts`
- SiliconFlow: `services/provider/siliconflow.ts`

---

## ⚠️ CONSTRAINTS

- **AUDIT FIRST** — Do not implement before auditing
- **REUSE EXISTING** — Do not duplicate business logic
- **NO REWRITE** — Auth, billing, transactions, database layer are stable
- **UZBEK** — User communicates in Uzbek, respond in Uzbek
- **STAY IN PROJECT** — Only work in `/root/hermes-agent/ThinkSync-Models`

---

*This file should be read first for any ThinkSync Models task.*