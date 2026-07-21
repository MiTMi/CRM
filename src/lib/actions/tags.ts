"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import { TAG_COLORS } from "@/lib/data/constants";
import type { ActivityType, Tag } from "@/lib/data/types";
import type { ActionResult } from "./types";

function now(): string {
  return new Date(NOW).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function logActivity(
  type: ActivityType,
  actorId: string,
  opts: { ticketId?: string; meta?: Record<string, string> },
): Promise<void> {
  await execute(
    `INSERT INTO activities (id,type,actor_id,ticket_id,customer_id,meta,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [
      uid("act"),
      type,
      actorId,
      opts.ticketId ?? null,
      null,
      opts.meta ? JSON.stringify(opts.meta) : null,
      now(),
    ],
  );
}

function revalidateTicketViews(ticketId?: string) {
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/customers");
  if (ticketId) revalidatePath(`/tickets/${ticketId}`);
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(32, "Tag name is too long"),
  color: z.enum(Object.keys(TAG_COLORS) as [string, ...string[]]).default("slate"),
});

/** Create a new workspace tag. Any authenticated user may create tags. */
export async function createTag(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<Tag>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, color } = parsed.data;

  const existing = await queryOne("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)", [
    name,
  ]);
  if (existing) return { ok: false, error: "A tag with that name already exists" };

  const id = uid("tag");
  const createdAt = now();
  await execute("INSERT INTO tags (id,name,color,created_at) VALUES (?,?,?,?)", [
    id,
    name,
    color,
    createdAt,
  ]);

  revalidateTicketViews();
  return { ok: true, data: { id, name, color, createdAt } };
}

/** Attach an existing tag to a ticket (idempotent). */
export async function addTagToTicket(
  ticketId: string,
  tagId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const [ticket, tag] = await Promise.all([
    queryOne("SELECT id FROM tickets WHERE id = ?", [ticketId]),
    queryOne<{ name: string }>("SELECT name FROM tags WHERE id = ?", [tagId]),
  ]);
  if (!ticket) return { ok: false, error: "Ticket not found" };
  if (!tag) return { ok: false, error: "Tag not found" };

  const linked = await queryOne(
    "SELECT 1 FROM ticket_tags WHERE ticket_id = ? AND tag_id = ?",
    [ticketId, tagId],
  );
  if (linked) return { ok: true, data: null };

  await execute("INSERT INTO ticket_tags (ticket_id,tag_id) VALUES (?,?)", [
    ticketId,
    tagId,
  ]);
  await execute("UPDATE tickets SET updated_at = ? WHERE id = ?", [now(), ticketId]);
  await logActivity("tagged", user.id, { ticketId, meta: { tag: tag.name } });

  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}

/** Remove a tag from a ticket. */
export async function removeTagFromTicket(
  ticketId: string,
  tagId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tag = await queryOne<{ name: string }>("SELECT name FROM tags WHERE id = ?", [
    tagId,
  ]);
  const changed = await execute(
    "DELETE FROM ticket_tags WHERE ticket_id = ? AND tag_id = ?",
    [ticketId, tagId],
  );
  if (changed === 0) return { ok: false, error: "Tag not on ticket" };

  await execute("UPDATE tickets SET updated_at = ? WHERE id = ?", [now(), ticketId]);
  await logActivity("untagged", user.id, {
    ticketId,
    meta: tag ? { tag: tag.name } : {},
  });

  revalidateTicketViews(ticketId);
  return { ok: true, data: null };
}

/** Delete a tag everywhere. Admin-only (destructive + workspace-wide). */
export async function deleteTag(tagId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can delete tags" };

  await execute("DELETE FROM ticket_tags WHERE tag_id = ?", [tagId]);
  const changed = await execute("DELETE FROM tags WHERE id = ?", [tagId]);
  if (changed === 0) return { ok: false, error: "Tag not found" };

  revalidateTicketViews();
  return { ok: true, data: null };
}
