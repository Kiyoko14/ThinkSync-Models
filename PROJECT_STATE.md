# ThinkSync Models — Project State

**Last Updated:** 2025-01-18 | **Project Phase:** 5C.8

---

## 🎯 Project Overview

AI Gateway platform with:
- **Frontend:** React (thinksync)
- **Backend:** Node.js/Express API Server
- **Database:** PostgreSQL (Supabase)
- **Bots:** Telegram Admin Bot + User Bot
- **Auth:** JWT tokens + API keys
- **AI Provider:** SiliconFlow

---

## 📊 Current Phase

**Phase 5C.8** — Platform Settings API

Completed Phases: 5A, 5B (all), 5C (1-7), 5D (1-3)

---

## 🏗️ Architecture

### Backend Stack
- **API:** Express.js (`artifacts/api-server/src/`)
- **Database:** PostgreSQL with native `pg` driver
- **Auth:** JWT (user) + hashed API keys
- **Billing:** Real balance deduction with transactions
- **Providers:** SiliconFlow (primary)

### Frontend Stack
- **Framework:** React + TypeScript
- **UI:** Shadcn/ui components
- **State:** Zustand + TanStack Query
- **API Client:** Custom with JWT/API key auth

### Telegram Bots
- **Admin Bot:** Payment approval, user management, model management
- **User Bot:** Account linking, balance, deposit, usage, API keys

---

## 📁 Key Locations

```
/root/hermes-agent/ThinkSync-Models/
├── artifacts/api-server/src/
│   ├── routes/v1.ts        # All API endpoints
│   ├── services/           # Business logic
│   ├── bot/                # Telegram bots
│   ├── db/schema.sql       # Database schema
│   └── lib/                # Utilities
├── artifacts/thinksync/src/
│   ├── pages/              # Frontend pages
│   └── lib/api/            # API client
└── systemd/                # Systemd services
```

---

## 🔑 Important Services

| Service | File | Purpose |
|---------|------|---------|
| User | `services/user.ts` | User CRUD, auth |
| API Key | `services/api-key.ts` | Key management |
| Billing | `services/billing.ts` | Balance, transactions |
| Model | `services/model.ts` | Model registry |
| Payment | `services/payment-request.ts` | Deposit workflow |
| Platform | `services/platform-settings.ts` | Config (Phase 5C.5+) |
| SiliconFlow | `services/provider/siliconflow.ts` | AI provider |

---

## ✅ Completed Features

- [x] PostgreSQL database with all tables
- [x] JWT + API key authentication
- [x] Chat/completions endpoint (streaming + non-streaming)
- [x] Real billing with balance deduction
- [x] Transaction logging
- [x] Payment request system
- [x] Telegram admin bot (payments, users, models, admins)
- [x] Telegram user bot (link, balance, deposit, usage)
- [x] Platform settings system
- [x] Provider timeout & retry (Phase 5C.7)
- [x] Global error handlers
- [x] Health check endpoints
- [x] Systemd services

---

## 🔴 Known Gaps / In Progress

- [ ] Frontend Platform Settings API integration
- [ ] Maintenance mode frontend display
- [ ] .env setup for production deployment
- [ ] Supabase database migration execution

---

## ⚠️ Constraints

| Constraint | Detail |
|------------|--------|
| **AUDIT FIRST** | No implementation before audit |
| **REUSE EXISTING** | Don't duplicate services |
| **NO REWRITE** | Stable: auth, billing, DB layer |
| **UZBEK** | User prefers Uzbek language |
| **PROJECT ROOT** | Must be in `/root/hermes-agent/ThinkSync-Models` |

---

## 🗄️ Archived Files

Historical phase reports and audits moved to:
```
archive/
```

Use `session_search` for past session info instead of reading archived documents.

---

## 📞 Database Connection

```
postgresql://postgres.[masked]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `SILICONFLOW_API_KEY`, `TELEGRAM_*_BOT_TOKEN`

---

*This file is the single source of truth for current project state.*