# Helpdesk CRM

A modern web CRM with an IT support ticketing system. Built design-first:
a polished, responsive UI running on realistic mock data, structured so a real
backend can be added without touching the pages.

## Stack

- **Next.js 16** (App Router, Server Actions, `proxy.ts` middleware) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives, Nova preset)
- **Recharts** for charts · lists filter/sort/paginate server-side via URL params
- **next-themes** for light/dark · **Sonner** for toasts · **Geist** font
- **PostgreSQL** — [PGlite](https://pglite.dev) (embedded Postgres, WASM) by
  default; **node-postgres** (`pg`) against a real server when `DATABASE_URL` is
  set · **zod** for validation

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

> **Data persists.** Tickets, comments, status/priority/assignee changes, and
> new tickets are written to a local Postgres database (embedded PGlite under
> `.data/pg`, created and seeded on first run) via Server Actions — reload and
> your changes remain. Set `DATABASE_URL` to use a real Postgres server instead.
>
> **Sign in required.** The app is behind session-cookie auth. Use a demo
> account (shown on the login page), e.g. `sarah.chen@helpdesk.io` (admin) or
> `marcus.reid@helpdesk.io` (technician) — password `password123` for all.

## What's here (Phases 1–3)

- **Dashboard** — KPI cards with sparklines & week-over-week deltas, a
  created-vs-resolved area chart, status donut, live ticket queue, technician
  workload bars, and an activity feed.
- **Tickets** — server-filtered/sorted/paginated table (tabs, search, priority &
  assignee filters, My Tickets, Overdue, SLA due column), a New Ticket dialog,
  and a two-column ticket detail with status/priority/assignee controls, an
  optimistic comment thread, and an SLA/due-date panel.
- **Customers** — searchable card grid and a detail page with Overview /
  Contacts / Tickets / Notes tabs. Create & edit customers (admin); add, edit,
  and delete contacts (delete is blocked when a contact is on tickets); post and
  delete notes — all persisted.
- **Technicians** — team cards with specialties and workload; admins can add
  technicians (new members can sign in with the demo password).
- **Command palette** (⌘K), a notification bell showing live recent activity,
  collapsible sidebar, full dark mode, per-route loading skeletons, empty states.

## Architecture

The key decision is the **data boundary**: every page reads data only through
`src/lib/data/repository.ts`. Nothing imports the mock arrays directly.

```
src/
  app/
    (app)/                 # authenticated shell: sidebar + topbar
      page.tsx             # dashboard
      tickets/             # list + [id] detail
      customers/           # list + [id] detail
      technicians/
      settings/
  components/
    ui/                    # shadcn primitives
    shell/                 # sidebar, topbar, command menu, theme toggle
    dashboard/             # charts, workload, activity feed
    tickets/ customers/    # feature components
  lib/
    db/
      schema.ts            # Postgres DDL
      index.ts             # async client (PGlite / pg) + query/queryOne/execute + seed
    data/
      types.ts             # domain types
      constants.ts         # status/priority styling (single source of truth)
      clock.ts             # fixed demo NOW
      mock.ts              # deterministic seed data (fixed NOW + seeded PRNG)
      sla.ts               # SLA policy + due-date compute
      repository.ts        # THE read interface pages use — async, Postgres
    auth/
      password.ts          # scrypt hash/verify
      session.ts           # HMAC-signed cookie session + getCurrentUser()
    actions/
      tickets.ts           # Server Actions: create/status/priority/assign/comment
      customers.ts         # customer/contact/note CRUD
      attachments.ts       # file upload/delete
      auth.ts              # login / logout
    format.ts              # date/relative-time/number helpers
```

Because every page reads through `repository.ts`, the data layer has been
swapped twice — mock arrays → SQLite → Postgres — with **no page markup
changed**. The client exposes a tiny `query`/`queryOne`/`execute` surface; the
repository and Server Actions are async against it. Seed data is generated
deterministically (fixed `NOW` + seeded PRNG) so the dashboard is stable and
server/client renders always match (no hydration mismatch).

> **Note on the data layer:** it evolved with the environment. Prisma 7 was
> ruled out (native driver adapters with no prebuilds for the very new Node 26
> ABI), so persistence first landed on Node's built-in `node:sqlite`, then
> migrated to **PostgreSQL** — running on **PGlite** (embedded, WASM) locally
> and **`pg`** against a server when `DATABASE_URL` is set.

## Roadmap

- **Phases 1–5 (done)** — design-first UI → real SQLite persistence with Server
  Actions → session-cookie auth with admin/technician roles → customer/contact/
  note CRUD with per-route loading skeletons. Writes are attributed to the
  signed-in user; admin-only actions and a "My Tickets" filter are gated by role.
- **Also done** — the management CRUD is complete (add technicians; add/edit/
  delete contacts; add/delete notes), a notification bell surfaces live
  activity, and every mutation writes an audit-trail Activity row.
- **Server-side search & pagination (done)** — the tickets and customers lists
  filter, sort, and paginate in SQL, driven entirely by URL search params
  (`/tickets?q=vpn&status=open&sort=priority&dir=asc&page=2`), so the state is
  shareable and only one page of rows is ever sent to the client. The command
  palette queries the server as you type instead of loading the whole workspace.
- **Optimistic UI (done)** — posting a ticket comment or a customer note shows
  the new item instantly (with a "sending"/"saving" state) via React 19's
  `useOptimistic`, then reconciles with the server and auto-reverts on error.
- **SLA / due dates (done)** — each ticket has a resolution due date derived
  from its priority (critical 4h · high 24h · medium 72h · low 120h, in
  `src/lib/data/sla.ts`). The ticket detail shows an SLA badge + due date, the
  list has a colour-coded "Due (SLA)" column and a server-side **Overdue**
  filter, and the dashboard surfaces the overdue count. No schema change — the
  due date is computed from `createdAt` + priority.
- **Ticket attachments (done)** — upload files to a ticket (validated by
  size/type), stored on local disk under `.data/uploads/` with metadata in the
  database and served through an auth-gated route handler
  (`/api/attachments/[id]`). Upload/download/delete all persist; a real deploy
  would swap disk for object storage behind the same action boundary.
- **PostgreSQL migration (done)** — the whole data layer moved from SQLite to
  Postgres. The repository and actions are async against `src/lib/db` (a thin
  `query`/`queryOne`/`execute` client). It runs on **PGlite** (embedded Postgres
  compiled to WASM) with zero setup, and switches to a real Postgres server via
  **`pg`** the moment `DATABASE_URL` is set — that env var is the only change
  needed for a concurrent multi-user deploy.
- **Next** — email notifications, and a production auth library (better-auth)
  layered on the Postgres backend.

## Security notes (demo)

Auth uses vetted `node:crypto` primitives — scrypt for password hashing and an
HMAC-SHA256-signed, httpOnly session cookie. For a real deployment: set
`AUTH_SECRET` in the environment (a strong random value; there's an insecure dev
fallback), serve over HTTPS (the cookie is already `secure` in production), and
swap SQLite for Postgres.
