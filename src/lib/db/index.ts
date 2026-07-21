import "server-only";
import { join } from "node:path";
import { SCHEMA } from "./schema";
import { SLA_HOURS } from "@/lib/data/sla";
import { hashPassword } from "@/lib/auth/password";
import {
  activities,
  comments,
  contacts,
  customers,
  notes,
  savedViews,
  tags,
  technicians,
  ticketTags,
  tickets,
} from "@/lib/data/mock";

// ---------------------------------------------------------------------------
// PostgreSQL data layer. Runs on PGlite (embedded Postgres, WASM) by default so
// it works with zero setup; set DATABASE_URL to point at a real Postgres server
// (node-postgres) — that's the only change needed for a multi-user deploy.
// ---------------------------------------------------------------------------

export const DEMO_PASSWORD = "password123";

type QueryResult = { rows: Record<string, unknown>[]; affectedRows?: number; rowCount?: number };

interface DbClient {
  query(text: string, params?: unknown[]): Promise<QueryResult>;
  exec(text: string): Promise<void>;
}

// Convert SQLite-style `?` placeholders to Postgres `$1, $2, …`.
function toPg(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

async function createClient(): Promise<DbClient> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Production path: a real Postgres server. `npm i pg` to enable.
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url });
    return {
      query: (t, p) => pool.query(t, p as unknown[]) as unknown as Promise<QueryResult>,
      exec: async (t) => {
        await pool.query(t);
      },
    };
  }
  // Default path: embedded Postgres (PGlite), persisted to disk.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(join(process.cwd(), ".data", "pg"));
  return {
    query: (t, p) => db.query(t, p as unknown[]) as unknown as Promise<QueryResult>,
    exec: (t) => db.exec(t).then(() => undefined),
  };
}

async function initialize(): Promise<DbClient> {
  const client = await createClient();
  await client.exec(SCHEMA);
  await seedIfEmpty(client);
  return client;
}

async function seedIfEmpty(client: DbClient) {
  const res = await client.query("SELECT COUNT(*)::int AS n FROM tickets");
  if ((res.rows[0]?.n as number) > 0) return;

  const run = (text: string, params: unknown[]) => client.query(toPg(text), params);

  await client.query("BEGIN");
  try {
    for (const c of customers)
      await run(
        `INSERT INTO customers (id,name,industry,website,phone,location,status,sla_tier,accent,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [c.id, c.name, c.industry, c.website, c.phone, c.location, c.status, c.slaTier, c.accent, c.createdAt],
      );

    for (const c of contacts)
      await run(
        `INSERT INTO contacts (id,customer_id,first_name,last_name,email,phone,role,is_primary)
         VALUES (?,?,?,?,?,?,?,?)`,
        [c.id, c.customerId, c.firstName, c.lastName, c.email, c.phone, c.role, c.isPrimary ? 1 : 0],
      );

    for (const t of technicians)
      await run(
        `INSERT INTO technicians (id,name,email,role,title,specialties,accent,password_hash)
         VALUES (?,?,?,?,?,?,?,?)`,
        [t.id, t.name, t.email, t.role, t.title, JSON.stringify(t.specialties), t.accent, hashPassword(DEMO_PASSWORD)],
      );

    for (const t of tickets)
      await run(
        `INSERT INTO tickets (id,number,title,description,status,priority,category,customer_id,contact_id,assignee_id,created_at,updated_at,resolved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [t.id, t.number, t.title, t.description, t.status, t.priority, t.category, t.customerId, t.contactId, t.assigneeId, t.createdAt, t.updatedAt, t.resolvedAt],
      );

    for (const c of comments)
      await run(
        `INSERT INTO ticket_comments (id,ticket_id,author_id,body,created_at) VALUES (?,?,?,?,?)`,
        [c.id, c.ticketId, c.authorId, c.body, c.createdAt],
      );

    for (const a of activities)
      await run(
        `INSERT INTO activities (id,type,actor_id,ticket_id,customer_id,meta,created_at) VALUES (?,?,?,?,?,?,?)`,
        [a.id, a.type, a.actorId, a.ticketId ?? null, a.customerId ?? null, a.meta ? JSON.stringify(a.meta) : null, a.createdAt],
      );

    for (const n of notes)
      await run(
        `INSERT INTO notes (id,customer_id,author_id,body,created_at) VALUES (?,?,?,?,?)`,
        [n.id, n.customerId, n.authorId, n.body, n.createdAt],
      );

    for (const t of tags)
      await run(
        `INSERT INTO tags (id,name,color,created_at) VALUES (?,?,?,?)`,
        [t.id, t.name, t.color, t.createdAt],
      );

    for (const tt of ticketTags)
      await run(
        `INSERT INTO ticket_tags (ticket_id,tag_id) VALUES (?,?)`,
        [tt.ticketId, tt.tagId],
      );

    for (const v of savedViews)
      await run(
        `INSERT INTO saved_views (id,owner_id,name,params,created_at) VALUES (?,?,?,?,?)`,
        [v.id, v.ownerId, v.name, v.params, v.createdAt],
      );

    for (const [priority, hours] of Object.entries(SLA_HOURS))
      await run(`INSERT INTO sla_policy (priority,hours) VALUES (?,?)`, [
        priority,
        hours,
      ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

// Singleton across HMR reloads.
const g = globalThis as unknown as { __crmDb?: Promise<DbClient> };

function getClient(): Promise<DbClient> {
  if (!g.__crmDb) g.__crmDb = initialize();
  return g.__crmDb;
}

/** Run a query, returning the rows. Accepts `?` placeholders. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await getClient();
  const res = await client.query(toPg(text), params);
  return res.rows as T[];
}

/** Run a query, returning the first row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a mutation, returning the number of affected rows. */
export async function execute(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  const client = await getClient();
  const res = await client.query(toPg(text), params);
  return res.affectedRows ?? res.rowCount ?? 0;
}
