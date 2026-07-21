"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PRIORITY_ORDER } from "@/lib/data/constants";
import type { SlaPolicy } from "@/lib/data/sla";
import type { ActionResult } from "./types";

// Each priority's base target, in whole hours. Bounded to a sane range
// (1 hour … 8760 hours = 1 year) so the UI can't persist absurd values.
const hoursSchema = z.coerce
  .number()
  .int("Use whole hours")
  .min(1, "Must be at least 1 hour")
  .max(8760, "Must be 1 year or less");

const policySchema = z.object({
  critical: hoursSchema,
  high: hoursSchema,
  medium: hoursSchema,
  low: hoursSchema,
});

/**
 * Update the base SLA target hours per priority. Admin-only. Values are stored
 * as whole hours; the Settings form converts day inputs to hours before calling.
 */
export async function updateSlaPolicy(
  input: Record<string, unknown>,
): Promise<ActionResult<SlaPolicy>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can change the SLA policy" };

  const parsed = policySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  for (const priority of PRIORITY_ORDER) {
    const hours = data[priority];
    // Upsert so it works whether or not the row was seeded.
    const changed = await execute(
      "UPDATE sla_policy SET hours = ? WHERE priority = ?",
      [hours, priority],
    );
    if (changed === 0) {
      const exists = await queryOne("SELECT priority FROM sla_policy WHERE priority = ?", [
        priority,
      ]);
      if (!exists)
        await execute("INSERT INTO sla_policy (priority,hours) VALUES (?,?)", [
          priority,
          hours,
        ]);
    }
  }

  // SLA feeds every ticket surface — refresh them all.
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/calendar");
  revalidatePath("/customers");
  revalidatePath("/settings");

  return { ok: true, data };
}
