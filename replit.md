# Aisync

A full-stack MVP website for Aisync — a 24/7 AI voice agent SaaS for businesses. Includes a beautiful landing page, client portal, and admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/aisync run dev` — run the frontend (port 23763)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + wouter + TanStack Query + Framer Motion + shadcn/ui
- API: Express 5 + express-session + bcrypt + multer
- DB: PostgreSQL (Replit built-in) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (one file per model)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/seed.ts` — demo seed data (runs on startup if DB is empty)
- `artifacts/aisync/src/pages/` — Landing, Login, ClientDashboard, AdminDashboard
- `artifacts/aisync/src/context/AuthContext.tsx` — auth state provider

## Demo Credentials

- Admin: `admin@aisync.ai` / `admin123`
- Client: `client@demo.com` / `client123`

## Architecture decisions

- Session-based auth (express-session + bcrypt) — simple, no JWT complexity for MVP
- Seeded demo data auto-runs on first startup if the users table is empty
- File uploads stored on disk under `artifacts/api-server/uploads/`, served statically at `/api/uploads/`
- OpenAPI spec is the single source of truth; never write raw fetch calls in the frontend

## Product

- Landing page: hero, problem/solution, features, how-it-works, use cases, benefits, demo request form
- Client portal: project overview, progress timeline, team, invoice, file uploads, change requests
- Admin dashboard: metrics, clients, projects, employees, invoices, feature requests, demo leads

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec
- Orval body schema names must be entity-shaped (e.g. `NoteInput`) never `CreateNoteBody` — causes TS2308
- `bcrypt` needs native build approval: run `pnpm approve-builds` and select bcrypt
- Numeric DB columns (`numeric` type) come back as strings from Postgres — parse with `parseFloat()` before returning

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
