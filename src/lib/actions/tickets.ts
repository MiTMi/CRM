"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActivityType } from "@/lib/data/types";
import type { ActionResult } from "./types";

/** All demo writes are stamped with the fixed demo clock so they stay coherent
 *  with the seeded data and show as "just now" in the feeds. */
function now(): string {
  return new Date(NOW).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function currentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

async function logActivity(
  type: ActivityType,
  actorId: string,
  opts: {
    ticketId?: string;
    customerId?: string;
    meta?: Record<string, string>;
  },
): Promise<void> {
  await execute(
    `INSERT INTO activities (id,type,actor_id,ticket_id,customer_id,meta,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [
      uid("act"),
      type,
      actorId,
      opts.ticketId ?? null,
      opts.customerId ?? null,
      opts.meta ? JSON.stringify(opts.meta) : null,
      now(),
    ],
  );
}

function revalidateTicketViews(ticketId?: string) {
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/technicians");
  revalidatePath("/customers");
  if (ticketId) revalidatePath(`/tickets/${ticketId}`);
}

// -- Schemas ---------------------------------------------------------------

const statusEnum = z.enum([
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
]);
const priorityEnum = z.enum(["critical", "high", "medium", "low"]);
const categoryEnum = z.enum([
  "hardware",
  "software",
  "network",
  "access",
  "other",
]);

// -- Create ----------------------------------------------------------------

const createSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().default(""),
  customerId: z.string().min(1, "Please select a customer"),
  assigneeId: z.string().nullish(),
  priority: priorityEnum.default("medium"),
  category: categoryEnum.default("software"),
});

export async function createTicket(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ id: string; number: number }>> {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false, error: "Not authenticated" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const customer = await queryOne("SELECT id FROM customers WHERE id = ?", [
    data.customerId,
  ]);
  if (!customer) return { ok: false, error: "Customer not found" };

  const contact = await queryOne<{ id: string }>(
    "SELECT id FROM contacts WHERE customer_id = ? ORDER BY is_primary DESC LIMIT 1",
    [data.customerId],
  );
  if (!contact) return { ok: false, error: "Customer has no contact" };

  const assigneeId =
    data.assigneeId && data.assigneeId !== "unassigned" ? data.assigneeId : null;

  const maxRow = await queryOne<{ m: number | null }>(
    "SELECT MAX(number) AS m FROM tickets",
  );
  const number = (maxRow?.m ?? 1000) + 1;
  const id = uid("ticket");
  const ts = now();

  await execute(
    `INSERT INTO tickets
      (id,number,title,description,status,priority,category,customer_id,contact_id,assignee_id,created_at,updated_at,resolved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, number, data.title, data.description, "open", data.priority, data.category,
      data.customerId, contact.id, assigneeId, ts, ts, null,
    ],
  );

  await logActivity("ticket_created", actorId, { ticketId: id });
  if (assigneeId) await logActivity("assigned", actorId, { ticketId: id });

  revalidateTicketViews(id);
  return { ok: true, data: { id, number } };
}

// -- Status ----------------------------------------------------------------

export async function updateTicketStatus(
  ticketId: string,
  status: z.infer<typeof statusEnum>,
): Promise<ActionResult> {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false, error: "Not authenticated" };

  const parsed = statusEnum.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  const current = await queryOne<{ status: string; resolved_at: string | null }>(
    "SELECT status, resolved_at FROM tickets WHERE id = ?",
    [ticketId],
  );
  if (!current) return { ok: false, error: "Ticket not found" };

  const isResolvedState = status === "resolved" || status === "closed";
  const resolvedAt = isResolvedState ? current.resolved_at ?? now() : null;

  await execute(
    "UPDATE tickets SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
    [status, resolvedAt, now(), ticketId],
  );

  await logActivity(status === "resolved" ? "resolved" : "status_changed", actorId, {
    ticketId,
    meta: { from: current.status, to: status },
  });

  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}

// -- Priority --------------------------------------------------------------

export async function updateTicketPriority(
  ticketId: string,
  priority: z.infer<typeof priorityEnum>,
): Promise<ActionResult> {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false, error: "Not authenticated" };

  const parsed = priorityEnum.safeParse(priority);
  if (!parsed.success) return { ok: false, error: "Invalid priority" };

  const current = await queryOne<{ priority: string }>(
    "SELECT priority FROM tickets WHERE id = ?",
    [ticketId],
  );
  if (!current) return { ok: false, error: "Ticket not found" };

  await execute("UPDATE tickets SET priority = ?, updated_at = ? WHERE id = ?", [
    priority,
    now(),
    ticketId,
  ]);

  await logActivity("priority_changed", actorId, {
    ticketId,
    meta: { from: current.priority, to: priority },
  });

  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}

// -- Assign ----------------------------------------------------------------

export async function assignTicket(
  ticketId: string,
  assigneeId: string | null,
): Promise<ActionResult> {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false, error: "Not authenticated" };

  const value = assigneeId && assigneeId !== "unassigned" ? assigneeId : null;

  if (value) {
    const tech = await queryOne("SELECT id FROM technicians WHERE id = ?", [value]);
    if (!tech) return { ok: false, error: "Technician not found" };
  }

  const changed = await execute(
    "UPDATE tickets SET assignee_id = ?, updated_at = ? WHERE id = ?",
    [value, now(), ticketId],
  );
  if (changed === 0) return { ok: false, error: "Ticket not found" };

  await logActivity("assigned", actorId, { ticketId });
  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}

// -- Comment ---------------------------------------------------------------

const commentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "Comment can't be empty"),
});

export async function addComment(
  ticketId: string,
  body: string,
): Promise<ActionResult> {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false, error: "Not authenticated" };

  const parsed = commentSchema.safeParse({ ticketId, body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }
  const ticket = await queryOne("SELECT id FROM tickets WHERE id = ?", [ticketId]);
  if (!ticket) return { ok: false, error: "Ticket not found" };

  await execute(
    `INSERT INTO ticket_comments (id,ticket_id,author_id,body,created_at)
     VALUES (?,?,?,?,?)`,
    [uid("comment"), ticketId, actorId, parsed.data.body, now()],
  );

  await execute("UPDATE tickets SET updated_at = ? WHERE id = ?", [now(), ticketId]);
  await logActivity("comment_added", actorId, { ticketId });

  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}
