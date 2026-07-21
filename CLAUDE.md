@AGENTS.md

# Helpdesk CRM — project guide

An IT helpdesk CRM: ticketing (SLAs, attachments, tags, saved views), customer
management, a calendar, and a team knowledge base. SLA targets are per-priority,
scaled by a per-customer service tier, and admin-editable at runtime. Next.js 16
+ React 19 + PostgreSQL. Public repo: https://github.com/MiTMi/CRM

## Run
- `npm run dev` → http://localhost:3000 — **zero setup** (embedded Postgres via PGlite; DB is created + seeded on first run under `.data/pg`).
- `npm run build` · `npm run lint`
- Demo login (password `password123` for all): `sarah.chen@helpdesk.io` (admin) · `marcus.reid@helpdesk.io` (technician).
- Set `DATABASE_URL` to run against a real Postgres server (via `pg`) instead of PGlite — that's the only change for a multi-user deploy.

## Stack
Next.js 16 (App Router, Server Actions, `proxy.ts` middleware, Turbopack) · React 19 · TypeScript · Tailwind v4 + shadcn/ui (Radix, Nova preset) · Recharts · **PostgreSQL** (PGlite embedded / `pg`) · zod · Sonner · next-themes · Geist.

## Where things live
- `src/lib/db/index.ts` — async DB client: `query` / `queryOne` / `execute` (write `?` placeholders — they're auto-converted to `$1,$2…`), plus schema apply + seed. Uses PGlite unless `DATABASE_URL` is set.
- `src/lib/db/schema.ts` — Postgres DDL (all `CREATE TABLE/INDEX IF NOT EXISTS`; re-applied on every server start). Newer tables: `tags` + `ticket_tags`, `saved_views`, `sla_policy`. New columns use `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (e.g. `customers.sla_tier`) since `CREATE TABLE IF NOT EXISTS` won't alter an existing table.
- `src/lib/data/repository.ts` — **the only read interface** for tickets/customers/technicians/activity/dashboard, plus tags, saved views, and the SLA policy (async, Postgres). `src/lib/data/knowledge.ts` — knowledge reads.
- `src/lib/data/mock.ts` — deterministic seed data (fixed NOW + seeded PRNG), incl. tags, saved views, and starter knowledge notes. `src/lib/data/clock.ts` — the fixed `NOW`. `src/lib/data/sla.ts` — SLA policy: `SLA_HOURS` (base per-priority defaults), `SLA_TIERS` (per-customer multipliers), `slaTargetHours`, and `computeSla(createdAt, priority, status, resolvedAt, tier?, base?)`. `src/lib/data/constants.ts` — status/priority/tag styling (single source of truth). `src/lib/data/types.ts` — domain types.
- `src/lib/actions/*` — Server Actions (tickets, customers, technicians, attachments, knowledge, auth, search, **tags**, **views** = saved views, **settings** = SLA policy). All return `ActionResult<T>` = `{ok:true,data}` | `{ok:false,error}`.
- `src/lib/auth/` — `password.ts` (scrypt) · `session.ts` (HMAC-signed httpOnly cookie + `getCurrentUser()`).
- `src/lib/storage.ts` — local-disk uploads at `.data/uploads`; downloads via `/api/attachments/[id]` and `/api/knowledge-attachments/[id]` (auth-gated route handlers).
- `src/proxy.ts` — middleware; redirects to `/login` when no session cookie (the layout is the authoritative check).
- `src/app/(app)/` — authenticated pages: dashboard (`page.tsx`), tickets, calendar, customers, technicians, knowledge, settings. `src/app/login/`, `src/app/api/`.
- `src/components/` — `ui/` (shadcn), `shell/` (sidebar/topbar/command palette/notification bell), plus feature folders (tickets/, customers/, knowledge/, dashboard/, settings/). Ticket tags: `tickets/ticket-tags-editor.tsx`; saved views: `tickets/saved-views.tsx`; SLA editor: `settings/sla-policy-form.tsx`.

## Conventions & gotchas — READ before editing
- **Fixed demo clock.** Everything uses `NOW` (2026-07-19T12:00Z) from `clock.ts`, not real time — keeps the dashboard/SLA stable and renders identically server/client (no hydration mismatch). All writes stamp `NOW`. Side effect: a row's created and updated timestamps are equal, so "updated vs created" copy can't distinguish them in the demo.
- **Repository boundary.** Pages read **only** through `repository.ts` / `knowledge.ts` — never query the DB directly from a page. This is why the data layer was swapped mock → SQLite → Postgres with no page markup changes. Keep it that way.
- **Everything is async** (Postgres). Repository + actions return promises; pages `await` (often `Promise.all`).
- **SQL dialect.** Use `?` placeholders (converted to `$n`), `ILIKE` for case-insensitive search, `COUNT(*)::int` for counts, `created_at::timestamptz + interval` for time math. The SLA overdue predicate (`overdueSql(policy)` in repository.ts) is **generated from the TS config** — base hours per priority × the customer's tier multiplier — so it can't drift from `sla.ts`. Keep it that way: don't hardcode SLA hours in SQL.
- **SLA model.** A ticket's target = `SLA_HOURS[priority]` × `SLA_TIERS[customer.slaTier].multiplier`, all computed (never stored) so a policy change takes effect instantly. Base hours are **admin-editable at runtime** via Settings (persisted in `sla_policy`, read by `getSlaPolicy()`, merged over the `SLA_HOURS` defaults). Everything that renders SLA passes the policy into `computeSla`; the client `ticket-table` and server `ticket-queue-item` take it as a `slaHours` prop.
- **Roles.** Every user is `admin` or `technician` (no other role). Admin-only: create/edit customer (incl. SLA tier), add technician, knowledge archive/history/restore, delete a tag, edit the SLA policy. Author-or-admin: edit/delete a knowledge note, edit/delete a contact. Any user: create/assign/remove tags, create/delete their own saved views.
- **Schema changes.** New **table** → add to `schema.ts` (`CREATE TABLE IF NOT EXISTS`). New **column** on an existing table → add an `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (a `CREATE TABLE IF NOT EXISTS` is a no-op once the table exists). Either way **restart the dev server** so `exec(SCHEMA)` applies it. Do **not** open a second PGlite connection to `.data/pg` while the dev server runs (PGlite is single-connection) — verify via the app instead.
- **Seeding.** `seedIfEmpty` is a one-shot gated on an empty `tickets` table (customers, tickets, tags, saved views, sla_policy, …). Knowledge notes are seeded separately by `seedKnowledgeNotes` (runs every startup, inserts each fixed-id starter note only when absent) so the knowledge base is always populated, survives reseeds, and never resurrects an edited/soft-deleted note. A `rm -rf .data/pg` wipe is only for demo variety — it's never required to apply schema changes, and it discards all app-created data.
- **`.data/`** (Postgres cluster + uploads) is gitignored.
- **Next 16 specifics.** Middleware is `proxy.ts` (not `middleware.ts`); data pages set `export const dynamic = "force-dynamic"`; server-side list state (search/sort/filter/pagination) lives in URL search params. Per AGENTS.md, read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- **Lists** filter/sort/paginate server-side via URL params (tickets also filter by tag and by saved view). The command palette searches server-side (a Server Action) across tickets, customers, technicians **and knowledge notes** (title + body), so the client never receives the whole dataset.

## Deferred / next steps
- **Email notifications** — intentionally deferred by the user; needs an external mail provider (Resend/SMTP). Plan a swappable/stubbed transport.
- Optional: add an MIT `LICENSE` (repo is public).

## Testing note
The in-app browser preview here is flaky (misfired clicks; the accessibility tree sometimes returns empty). Prefer `form_input` via element refs, confirm writes by querying the DB, and restart the dev server after schema changes. See `README.md` for the feature list and `git log` for build history.
