// ---------------------------------------------------------------------------
// The ONLY interface pages use to read data. Backed by PostgreSQL (PGlite by
// default, a real server via DATABASE_URL). Functions are async; aggregation
// logic runs in JS over fetched rows, unchanged since Phase 1.
// ---------------------------------------------------------------------------

import "server-only";
import { query, queryOne } from "@/lib/db";
import { NOW } from "./clock";
import type {
  Activity,
  ActivityFeedItem,
  Attachment,
  Contact,
  Customer,
  CustomerPage,
  CustomerQuery,
  CustomerWithStats,
  DashboardStats,
  Note,
  SavedView,
  StatusCounts,
  StatusSlice,
  Tag,
  Technician,
  TechnicianWorkload,
  Ticket,
  TicketComment,
  TicketPage,
  TicketPriority,
  TicketQuery,
  TicketWithRelations,
  VolumePoint,
  WorkspaceSearchResults,
} from "./types";
import { STATUS_ORDER } from "./constants";
import { SLA_HOURS, SLA_TIERS, type SlaPolicy } from "./sla";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const OPEN_STATES = new Set(["open", "in_progress", "waiting_on_customer"]);

// -- Row mappers -----------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    industry: r.industry,
    website: r.website,
    phone: r.phone,
    location: r.location,
    status: r.status,
    slaTier: r.sla_tier ?? "standard",
    accent: r.accent,
    createdAt: r.created_at,
  };
}

function mapContact(r: any): Contact {
  return {
    id: r.id,
    customerId: r.customer_id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    isPrimary: !!r.is_primary,
  };
}

function mapTechnician(r: any): Technician {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    title: r.title,
    specialties: JSON.parse(r.specialties),
    accent: r.accent,
  };
}

function mapTicket(r: any): Ticket {
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: r.category,
    customerId: r.customer_id,
    contactId: r.contact_id,
    assigneeId: r.assignee_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at ?? null,
  };
}

function mapComment(r: any): TicketComment {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
  };
}

function mapActivity(r: any): Activity {
  return {
    id: r.id,
    type: r.type,
    actorId: r.actor_id,
    ticketId: r.ticket_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    meta: r.meta ? JSON.parse(r.meta) : undefined,
    createdAt: r.created_at,
  };
}

function mapTag(r: any): Tag {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    createdAt: r.created_at,
  };
}

function mapAttachment(r: any): Attachment {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    uploaderId: r.uploader_id,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// -- Base fetchers ---------------------------------------------------------

async function allCustomers(): Promise<Customer[]> {
  return (await query("SELECT * FROM customers ORDER BY created_at DESC")).map(
    mapCustomer,
  );
}

async function allContacts(): Promise<Contact[]> {
  return (await query("SELECT * FROM contacts")).map(mapContact);
}

async function allTechnicians(): Promise<Technician[]> {
  return (await query("SELECT * FROM technicians ORDER BY name")).map(
    mapTechnician,
  );
}

async function allTickets(): Promise<Ticket[]> {
  return (await query("SELECT * FROM tickets ORDER BY created_at DESC")).map(
    mapTicket,
  );
}

// -- Simple lookups --------------------------------------------------------

export async function getTechnicians(): Promise<Technician[]> {
  return allTechnicians();
}

export async function getTechnicianById(id: string): Promise<Technician | null> {
  const r = await queryOne("SELECT * FROM technicians WHERE id = ?", [id]);
  return r ? mapTechnician(r) : null;
}

export async function getCustomers(): Promise<Customer[]> {
  return allCustomers();
}

export async function getContactById(id: string): Promise<Contact | null> {
  const r = await queryOne("SELECT * FROM contacts WHERE id = ?", [id]);
  return r ? mapContact(r) : null;
}

export async function getContactsForCustomer(
  customerId: string,
): Promise<Contact[]> {
  return (
    await query(
      "SELECT * FROM contacts WHERE customer_id = ? ORDER BY is_primary DESC",
      [customerId],
    )
  ).map(mapContact);
}

export async function getNotesForCustomer(customerId: string): Promise<Note[]> {
  return (
    await query(
      "SELECT * FROM notes WHERE customer_id = ? ORDER BY created_at DESC",
      [customerId],
    )
  ).map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    authorId: r.author_id as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  }));
}

// -- Joins -----------------------------------------------------------------

async function makeJoiner(): Promise<(ticket: Ticket) => TicketWithRelations> {
  const [custList, contactList, techList, tagsByTicket] = await Promise.all([
    allCustomers(),
    allContacts(),
    allTechnicians(),
    tagsByTicketMap(),
  ]);
  const customers = new Map(custList.map((c) => [c.id, c]));
  const contacts = new Map(contactList.map((c) => [c.id, c]));
  const contactsByCustomer = new Map<string, Contact[]>();
  for (const c of contacts.values()) {
    const arr = contactsByCustomer.get(c.customerId) ?? [];
    arr.push(c);
    contactsByCustomer.set(c.customerId, arr);
  }
  const techs = new Map(techList.map((t) => [t.id, t]));
  return (ticket: Ticket): TicketWithRelations => ({
    ...ticket,
    customer: customers.get(ticket.customerId)!,
    contact:
      contacts.get(ticket.contactId) ??
      contactsByCustomer.get(ticket.customerId)?.[0]!,
    assignee: ticket.assigneeId ? techs.get(ticket.assigneeId) ?? null : null,
    tags: tagsByTicket.get(ticket.id) ?? [],
  });
}

// -- Tags ------------------------------------------------------------------

export async function getAllTags(): Promise<Tag[]> {
  return (await query("SELECT * FROM tags ORDER BY name")).map(mapTag);
}

/** ticketId → its tags (name-sorted). Loaded once per joiner build. */
async function tagsByTicketMap(): Promise<Map<string, Tag[]>> {
  const rows = await query<Record<string, unknown>>(
    `SELECT tt.ticket_id AS ticket_id, tg.*
     FROM ticket_tags tt JOIN tags tg ON tg.id = tt.tag_id
     ORDER BY tg.name`,
  );
  const map = new Map<string, Tag[]>();
  for (const r of rows) {
    const ticketId = r.ticket_id as string;
    const arr = map.get(ticketId) ?? [];
    arr.push(mapTag(r));
    map.set(ticketId, arr);
  }
  return map;
}

export async function getTagsForTicket(ticketId: string): Promise<Tag[]> {
  return (
    await query(
      `SELECT tg.* FROM ticket_tags tt JOIN tags tg ON tg.id = tt.tag_id
       WHERE tt.ticket_id = ? ORDER BY tg.name`,
      [ticketId],
    )
  ).map(mapTag);
}

// -- Saved views -----------------------------------------------------------

function mapSavedView(r: Record<string, unknown>): SavedView {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    params: r.params as string,
    createdAt: r.created_at as string,
  };
}

export async function getSavedViews(ownerId: string): Promise<SavedView[]> {
  return (
    await query(
      "SELECT * FROM saved_views WHERE owner_id = ? ORDER BY created_at ASC",
      [ownerId],
    )
  ).map(mapSavedView);
}

// -- SLA policy ------------------------------------------------------------

/** Admin-editable base SLA target hours per priority, merged over the code
 *  defaults so a missing/empty table still yields a complete, valid policy. */
export async function getSlaPolicy(): Promise<SlaPolicy> {
  const rows = await query<{ priority: string; hours: number }>(
    "SELECT priority, hours FROM sla_policy",
  );
  const policy: SlaPolicy = { ...SLA_HOURS };
  for (const r of rows) {
    if (r.priority in policy) policy[r.priority as TicketPriority] = r.hours;
  }
  return policy;
}

export async function getTickets(): Promise<TicketWithRelations[]> {
  const [join, tickets] = await Promise.all([makeJoiner(), allTickets()]);
  return tickets.map(join);
}

export async function getTicketById(
  id: string,
): Promise<TicketWithRelations | null> {
  const r = await queryOne("SELECT * FROM tickets WHERE id = ?", [id]);
  if (!r) return null;
  const join = await makeJoiner();
  return join(mapTicket(r));
}

export async function getTicketsForCustomer(
  customerId: string,
): Promise<TicketWithRelations[]> {
  const [join, rows] = await Promise.all([
    makeJoiner(),
    query("SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC", [
      customerId,
    ]),
  ]);
  return rows.map(mapTicket).map(join);
}

// -- Server-side paginated ticket query ------------------------------------

const PRIORITY_SORT_SQL =
  "CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END";

// Tier multiplier is generated from the TS config (tiers stay in code). Fetched
// via a correlated subquery so the overdue predicate stays self-contained —
// usable with just `FROM tickets t`, no customers join required.
const TIER_MULT_SQL = `CASE (SELECT sla_tier FROM customers WHERE id = t.customer_id) ${Object.entries(
  SLA_TIERS,
)
  .map(([tier, cfg]) => `WHEN '${tier}' THEN ${cfg.multiplier}`)
  .join(" ")} ELSE 1 END`;

/** SLA due-date SQL for the given (admin-editable) base-hours policy. The hours
 *  are integers from the DB, so interpolating them is safe. */
function overdueSql(policy: SlaPolicy): string {
  const hoursSql = `CASE t.priority ${(Object.keys(SLA_HOURS) as TicketPriority[])
    .map((p) => `WHEN '${p}' THEN ${Math.round(policy[p] ?? SLA_HOURS[p])}`)
    .join(" ")} END`;
  const dueSql = `(t.created_at::timestamptz + (((${hoursSql}) * (${TIER_MULT_SQL}))::text || ' hours')::interval)`;
  return `(${dueSql} < ?::timestamptz AND t.status IN ('open','in_progress','waiting_on_customer'))`;
}

function nowIso(): string {
  return new Date(NOW).toISOString();
}

export async function getOverdueCount(): Promise<number> {
  const policy = await getSlaPolicy();
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM tickets t WHERE ${overdueSql(policy)}`,
    [nowIso()],
  );
  return r?.n ?? 0;
}

const EMPTY_STATUS_COUNTS: StatusCounts = {
  all: 0,
  open: 0,
  in_progress: 0,
  waiting_on_customer: 0,
  resolved: 0,
  closed: 0,
};

export async function getTicketsPage(q: TicketQuery): Promise<TicketPage> {
  const pageSize = q.pageSize ?? 12;

  // Clauses shared by the counts + page query (everything EXCEPT status).
  const baseWhere: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseArgs: any[] = [];

  const term = q.query?.trim();
  if (term) {
    const like = `%${term}%`;
    baseWhere.push(
      "(t.title ILIKE ? OR c.name ILIKE ? OR t.description ILIKE ? OR CAST(t.number AS TEXT) ILIKE ?)",
    );
    baseArgs.push(like, like, like, like);
  }
  if (q.priority && q.priority !== "all") {
    baseWhere.push("t.priority = ?");
    baseArgs.push(q.priority);
  }
  if (q.mine) {
    baseWhere.push("t.assignee_id = ?");
    baseArgs.push(q.mine);
  } else if (q.assigneeId === "unassigned") {
    baseWhere.push("t.assignee_id IS NULL");
  } else if (q.assigneeId && q.assigneeId !== "all") {
    baseWhere.push("t.assignee_id = ?");
    baseArgs.push(q.assigneeId);
  }
  if (q.tagId && q.tagId !== "all") {
    baseWhere.push(
      "EXISTS (SELECT 1 FROM ticket_tags tt WHERE tt.ticket_id = t.id AND tt.tag_id = ?)",
    );
    baseArgs.push(q.tagId);
  }
  if (q.overdue) {
    baseWhere.push(overdueSql(await getSlaPolicy()));
    baseArgs.push(nowIso());
  }

  const baseWhereSql = baseWhere.length ? `WHERE ${baseWhere.join(" AND ")}` : "";

  // Per-status counts (respecting the non-status filters).
  const statusCounts: StatusCounts = { ...EMPTY_STATUS_COUNTS };
  const countRows = await query<{ status: keyof StatusCounts; n: number }>(
    `SELECT t.status AS status, COUNT(*)::int AS n
     FROM tickets t JOIN customers c ON c.id = t.customer_id
     ${baseWhereSql} GROUP BY t.status`,
    baseArgs,
  );
  for (const r of countRows) {
    statusCounts[r.status] = r.n;
    statusCounts.all += r.n;
  }

  const total =
    q.status && q.status !== "all" ? statusCounts[q.status] ?? 0 : statusCounts.all;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pageCount);
  const offset = (page - 1) * pageSize;

  const where = [...baseWhere];
  const args = [...baseArgs];
  if (q.status && q.status !== "all") {
    where.push("t.status = ?");
    args.push(q.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sortCol =
    q.sort === "priority" ? PRIORITY_SORT_SQL : q.sort === "title" ? "t.title" : "t.created_at";
  const dir = q.dir === "asc" ? "ASC" : "DESC";

  const rows = (
    await query(
      `SELECT t.* FROM tickets t JOIN customers c ON c.id = t.customer_id
       ${whereSql} ORDER BY ${sortCol} ${dir}, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
  ).map(mapTicket);

  const join = await makeJoiner();
  return {
    rows: rows.map(join),
    total,
    page,
    pageCount,
    pageSize,
    statusCounts,
  };
}

export async function getCommentsForTicket(
  ticketId: string,
): Promise<TicketComment[]> {
  return (
    await query(
      "SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticketId],
    )
  ).map(mapComment);
}

export async function getAttachmentsForTicket(
  ticketId: string,
): Promise<Attachment[]> {
  return (
    await query(
      "SELECT * FROM attachments WHERE ticket_id = ? ORDER BY created_at DESC",
      [ticketId],
    )
  ).map(mapAttachment);
}

/** Includes the on-disk path — for the download route only. */
export async function getAttachmentRecord(
  id: string,
): Promise<(Attachment & { path: string }) | null> {
  const r = await queryOne("SELECT * FROM attachments WHERE id = ?", [id]);
  if (!r) return null;
  return { ...mapAttachment(r), path: r.path as string };
}

// -- Customers with stats --------------------------------------------------

export async function getCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [customers, contacts, tickets] = await Promise.all([
    allCustomers(),
    allContacts(),
    allTickets(),
  ]);
  return customers.map((customer) => {
    const custContacts = contacts.filter((c) => c.customerId === customer.id);
    const custTickets = tickets.filter((t) => t.customerId === customer.id);
    return {
      ...customer,
      contactCount: custContacts.length,
      openTickets: custTickets.filter((t) => OPEN_STATES.has(t.status)).length,
      totalTickets: custTickets.length,
      primaryContact:
        custContacts.find((c) => c.isPrimary) ?? custContacts[0] ?? null,
    };
  });
}

export async function getCustomerById(
  id: string,
): Promise<CustomerWithStats | null> {
  return (await getCustomersWithStats()).find((c) => c.id === id) ?? null;
}

/** Server-side searched + paginated customers (stats via SQL subqueries). */
export async function getCustomersPage(q: CustomerQuery): Promise<CustomerPage> {
  const pageSize = q.pageSize ?? 9;

  const where: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [];
  const term = q.query?.trim();
  if (term) {
    const like = `%${term}%`;
    where.push("(name ILIKE ? OR industry ILIKE ? OR location ILIKE ?)");
    args.push(like, like, like);
  }
  if (q.status && q.status !== "all") {
    where.push("status = ?");
    args.push(q.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM customers ${whereSql}`,
    args,
  );
  const total = totalRow?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pageCount);
  const offset = (page - 1) * pageSize;

  const openList = "('open','in_progress','waiting_on_customer')";
  const rows = (
    await query(
      `SELECT c.*,
         (SELECT COUNT(*)::int FROM contacts ct WHERE ct.customer_id = c.id) AS contact_count,
         (SELECT COUNT(*)::int FROM tickets t WHERE t.customer_id = c.id) AS total_tickets,
         (SELECT COUNT(*)::int FROM tickets t WHERE t.customer_id = c.id AND t.status IN ${openList}) AS open_tickets
       FROM customers c ${whereSql} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((r: any): CustomerWithStats => ({
    ...mapCustomer(r),
    contactCount: r.contact_count,
    totalTickets: r.total_tickets,
    openTickets: r.open_tickets,
    primaryContact: null,
  }));

  return { rows, total, page, pageCount, pageSize };
}

// -- Global workspace search (command palette) -----------------------------

export async function searchWorkspace(
  q: string,
  limit = 6,
): Promise<WorkspaceSearchResults> {
  const term = q.trim();
  if (!term)
    return { tickets: [], customers: [], technicians: [], knowledge: [] };
  const like = `%${term}%`;

  const [tRows, cRows, teRows, kRows] = await Promise.all([
    query(
      `SELECT t.id AS id, t.number AS number, t.title AS title, c.name AS customer
       FROM tickets t JOIN customers c ON c.id = t.customer_id
       WHERE t.title ILIKE ? OR c.name ILIKE ? OR CAST(t.number AS TEXT) ILIKE ?
       ORDER BY t.created_at DESC LIMIT ?`,
      [like, like, like, limit],
    ),
    query(
      `SELECT id, name, industry FROM customers
       WHERE name ILIKE ? OR industry ILIKE ? ORDER BY name LIMIT ?`,
      [like, like, limit],
    ),
    query(
      `SELECT id, name, title FROM technicians
       WHERE name ILIKE ? OR title ILIKE ? ORDER BY name LIMIT ?`,
      [like, like, limit],
    ),
    // Knowledge base: title or body, excluding soft-deleted notes.
    query(
      `SELECT id, title, body FROM knowledge_notes
       WHERE deleted_at IS NULL AND (title ILIKE ? OR body ILIKE ?)
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, limit],
    ),
  ]);

  return {
    tickets: tRows.map((r) => ({
      id: r.id as string,
      number: r.number as number,
      title: r.title as string,
      customer: r.customer as string,
    })),
    customers: cRows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      industry: r.industry as string,
    })),
    technicians: teRows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      title: r.title as string,
    })),
    knowledge: kRows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      snippet: snippetFor(r.body as string, term),
    })),
  };
}

/** A short body excerpt centered on the match, for the search dropdown. */
function snippetFor(body: string, term: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return text.slice(0, 80) + (text.length > 80 ? "…" : "");
  const start = Math.max(0, at - 30);
  const slice = text.slice(start, start + 90);
  return (start > 0 ? "…" : "") + slice + (start + 90 < text.length ? "…" : "");
}

// -- Activity --------------------------------------------------------------

export async function getRecentActivity(limit = 8): Promise<Activity[]> {
  return (
    await query("SELECT * FROM activities ORDER BY created_at DESC LIMIT ?", [
      limit,
    ])
  ).map(mapActivity);
}

/** Recent activity enriched with the names/numbers the feed + bell display. */
export async function getActivityFeed(limit = 8): Promise<ActivityFeedItem[]> {
  const [activities, techList, custList, tickets] = await Promise.all([
    getRecentActivity(limit),
    allTechnicians(),
    allCustomers(),
    allTickets(),
  ]);
  const techs = new Map(techList.map((t) => [t.id, t]));
  const customers = new Map(custList.map((c) => [c.id, c]));
  const tix = new Map(tickets.map((t) => [t.id, t]));

  return activities.map((a) => {
    const ticket = a.ticketId ? tix.get(a.ticketId) : undefined;
    const customerId = a.customerId ?? ticket?.customerId;
    return {
      id: a.id,
      type: a.type,
      actorName: techs.get(a.actorId)?.name ?? "System",
      createdAt: a.createdAt,
      ticketId: a.ticketId,
      ticketNumber: ticket?.number,
      customerId,
      customerName: customerId ? customers.get(customerId)?.name : undefined,
      meta: a.meta,
    };
  });
}

// -- Dashboard aggregates (JS over fetched rows, unchanged) -----------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const [tickets, customers] = await Promise.all([allTickets(), allCustomers()]);

  const countCreatedInWindow = (startMsAgo: number, endMsAgo: number) =>
    tickets.filter((t) => {
      const age = NOW - Date.parse(t.createdAt);
      return age <= startMsAgo && age > endMsAgo;
    }).length;

  const countResolvedInWindow = (startMsAgo: number, endMsAgo: number) =>
    tickets.filter((t) => {
      if (!t.resolvedAt) return false;
      const age = NOW - Date.parse(t.resolvedAt);
      return age <= startMsAgo && age > endMsAgo;
    }).length;

  const pctDelta = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const openTickets = tickets.filter((t) => OPEN_STATES.has(t.status)).length;

  const openPrev = tickets.filter((t) => {
    const created = Date.parse(t.createdAt);
    if (created > NOW - 7 * DAY) return false;
    const resolved = t.resolvedAt ? Date.parse(t.resolvedAt) : null;
    return resolved == null || resolved > NOW - 7 * DAY;
  }).length;

  const resolved7d = countResolvedInWindow(7 * DAY, 0);
  const resolvedPrev7d = countResolvedInWindow(14 * DAY, 7 * DAY);

  const recentResolved = tickets.filter(
    (t) => t.resolvedAt && NOW - Date.parse(t.resolvedAt) <= 14 * DAY,
  );
  const avgResolutionHours =
    recentResolved.length === 0
      ? 0
      : Math.round(
          (recentResolved.reduce(
            (sum, t) => sum + (Date.parse(t.resolvedAt!) - Date.parse(t.createdAt)),
            0,
          ) /
            recentResolved.length /
            HOUR) *
            10,
        ) / 10;

  const prevResolved = tickets.filter(
    (t) =>
      t.resolvedAt &&
      NOW - Date.parse(t.resolvedAt) > 14 * DAY &&
      NOW - Date.parse(t.resolvedAt) <= 28 * DAY,
  );
  const avgResolutionPrev =
    prevResolved.length === 0
      ? avgResolutionHours
      : prevResolved.reduce(
          (sum, t) => sum + (Date.parse(t.resolvedAt!) - Date.parse(t.createdAt)),
          0,
        ) /
        prevResolved.length /
        HOUR;

  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const activeCustomersPrev = customers.filter(
    (c) => c.status === "active" && Date.parse(c.createdAt) <= NOW - 7 * DAY,
  ).length;

  const openSpark: number[] = [];
  const resolvedSpark: number[] = [];
  const resolutionSpark: number[] = [];
  const customersSpark: number[] = [];
  for (let d = 6; d >= 0; d--) {
    const start = (d + 1) * DAY;
    const end = d * DAY;
    openSpark.push(countCreatedInWindow(start, end));
    resolvedSpark.push(countResolvedInWindow(start, end));
    const dayResolved = tickets.filter(
      (t) =>
        t.resolvedAt &&
        NOW - Date.parse(t.resolvedAt) <= start &&
        NOW - Date.parse(t.resolvedAt) > end,
    );
    resolutionSpark.push(
      dayResolved.length === 0
        ? 0
        : Math.round(
            dayResolved.reduce(
              (s, t) => s + (Date.parse(t.resolvedAt!) - Date.parse(t.createdAt)),
              0,
            ) /
              dayResolved.length /
              HOUR,
          ),
    );
    customersSpark.push(
      customers.filter(
        (c) => Date.parse(c.createdAt) <= NOW - end && c.status === "active",
      ).length,
    );
  }

  return {
    openTickets,
    openTicketsDelta: pctDelta(openTickets, openPrev),
    avgResolutionHours,
    avgResolutionDelta: pctDelta(
      Math.round(avgResolutionHours),
      Math.round(avgResolutionPrev),
    ),
    resolved7d,
    resolved7dDelta: pctDelta(resolved7d, resolvedPrev7d),
    activeCustomers,
    activeCustomersDelta: pctDelta(activeCustomers, activeCustomersPrev),
    spark: {
      open: openSpark,
      resolution: resolutionSpark,
      resolved: resolvedSpark,
      customers: customersSpark,
    },
  };
}

export async function getTicketVolume(days = 30): Promise<VolumePoint[]> {
  const tickets = await allTickets();
  const points: VolumePoint[] = [];
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  for (let d = days - 1; d >= 0; d--) {
    const dayStart = NOW - (d + 1) * DAY;
    const dayEnd = NOW - d * DAY;
    const created = tickets.filter((t) => {
      const c = Date.parse(t.createdAt);
      return c > dayStart && c <= dayEnd;
    }).length;
    const resolved = tickets.filter((t) => {
      if (!t.resolvedAt) return false;
      const r = Date.parse(t.resolvedAt);
      return r > dayStart && r <= dayEnd;
    }).length;
    points.push({
      date: new Date(dayEnd).toISOString(),
      label: monthDay.format(new Date(dayEnd)),
      created,
      resolved,
    });
  }
  return points;
}

export async function getStatusDistribution(): Promise<StatusSlice[]> {
  const tickets = await allTickets();
  return STATUS_ORDER.map((status) => ({
    status,
    count: tickets.filter((t) => t.status === status).length,
  })).filter((s) => s.count > 0);
}

export async function getTechnicianWorkload(): Promise<TechnicianWorkload[]> {
  const [tickets, techList] = await Promise.all([allTickets(), allTechnicians()]);
  const rows = techList.map((technician) => {
    const assigned = tickets.filter((t) => t.assigneeId === technician.id);
    const open = assigned.filter((t) => OPEN_STATES.has(t.status)).length;
    const inProgress = assigned.filter((t) => t.status === "in_progress").length;
    const resolved7d = assigned.filter(
      (t) => t.resolvedAt && NOW - Date.parse(t.resolvedAt) <= 7 * DAY,
    ).length;
    return { technician, open, inProgress, resolved7d, load: 0 };
  });
  const maxOpen = Math.max(1, ...rows.map((r) => r.open));
  for (const r of rows) r.load = r.open / maxOpen;
  return rows.sort((a, b) => b.open - a.open);
}
