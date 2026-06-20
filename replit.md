# ThinkSync Models

Production-ready AI API gateway and billing platform — a FastAPI backend + Vite + React frontend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/thinksync run dev` — run the Vite frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React 18 + Tailwind CSS v4 + shadcn/ui
- API: Express 5 (server artifact) + FastAPI (Python backend)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for server), Vite for frontend

## Where things live

- `artifacts/thinksync/` — Vite + React frontend
  - `src/App.tsx` — Router with all routes
  - `src/lib/api/client.ts` — API client with all endpoints
  - `src/lib/types.ts` — TypeScript types
  - `src/store/auth-store.ts` — Zustand auth store
  - `src/store/settings-store.ts` — Zustand settings (lang, API base URL)
  - `src/pages/` — All pages (home, models, pricing, docs, login, register, dashboard, admin)
  - `src/components/layout/` — Layout components (header, footer, dashboard/admin shells)
  - `src/components/common/` — Reusable components (auth-guard, admin-guard, stat-card, theme-toggle)
  - `src/lib/i18n/translations.ts` — i18n (en, uz, ru)
  - `src/providers/` — Theme + Query providers
- `artifacts/api-server/` — Express API server

## Architecture decisions

- **Wouter for routing** — lightweight, zero-dependency router
- **Zustand for state** — auth, settings stored in localStorage with persistence
- **React Query for server state** — automatic caching, invalidation, and loading states
- **next-themes for theming** — system-aware dark/light mode
- **API token authentication** — users authenticate with their existing API key (thc_...) or JWT
- **Admin guard via email** — admin@thinksync.ai grants access to the admin panel

## Product

ThinkSync Models is a production-ready AI API gateway and billing platform. Users can:

- Browse available AI models with pricing
- View package pricing and purchase packages
- Authenticate with their existing API key
- View their dashboard with usage, balance, and billing history
- Generate, rotate, and revoke API keys
- Admin users can manage models, users, packages, promocodes, transactions, and view audit logs
- See analytics dashboard with charts

## Gotchas

- Frontend dev server requires `PORT` and `BASE_PATH` env vars (managed by Replit workflow)
- The backend must be running at the configured API base URL for data fetching to work
- Admin panel is only accessible when the logged-in user's email is `admin@thinksync.ai`
- API base URL is configurable per-user in the login/register page

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `PHASE3B_REPORT.md` for the complete admin panel feature list
