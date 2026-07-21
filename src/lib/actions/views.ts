"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import type { SavedView } from "@/lib/data/types";
import type { ActionResult } from "./types";

function now(): string {
  return new Date(NOW).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// Keys the tickets list understands. Anything else in a saved view's params is
// dropped so a view can only ever encode a filter/sort state (never junk).
const ALLOWED_KEYS = new Set([
  "q",
  "status",
  "priority",
  "assignee",
  "mine",
  "overdue",
  "tag",
  "sort",
  "dir",
]);

/** Keep only recognised filter/sort keys, drop `page`, and normalise ordering. */
function sanitizeParams(raw: string): string {
  const input = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const out = new URLSearchParams();
  for (const key of ALLOWED_KEYS) {
    const value = input.get(key);
    if (value != null && value !== "") out.set(key, value);
  }
  return out.toString();
}

const createSchema = z.object({
  name: z.string().trim().min(1, "View name is required").max(40, "View name is too long"),
  params: z.string().default(""),
});

/** Save the current ticket-list filter/sort state as a named view for the user. */
export async function createSavedView(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<SavedView>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const name = parsed.data.name;
  const params = sanitizeParams(parsed.data.params);

  const existing = await queryOne(
    "SELECT id FROM saved_views WHERE owner_id = ? AND LOWER(name) = LOWER(?)",
    [user.id, name],
  );
  if (existing) return { ok: false, error: "You already have a view with that name" };

  const id = uid("view");
  const createdAt = now();
  await execute(
    "INSERT INTO saved_views (id,owner_id,name,params,created_at) VALUES (?,?,?,?,?)",
    [id, user.id, name, params, createdAt],
  );

  revalidatePath("/tickets");
  return { ok: true, data: { id, ownerId: user.id, name, params, createdAt } };
}

/** Delete a saved view. Owner-only. */
export async function deleteSavedView(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const view = await queryOne<{ owner_id: string }>(
    "SELECT owner_id FROM saved_views WHERE id = ?",
    [id],
  );
  if (!view) return { ok: false, error: "View not found" };
  if (view.owner_id !== user.id)
    return { ok: false, error: "You can only delete your own views" };

  await execute("DELETE FROM saved_views WHERE id = ?", [id]);
  revalidatePath("/tickets");
  return { ok: true, data: null };
}
