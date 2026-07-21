"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute, DEMO_PASSWORD } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { AVATAR_TINTS } from "@/lib/data/constants";
import type { ActionResult } from "./types";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function accentFor(name: string): string {
  const keys = Object.keys(AVATAR_TINTS);
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return keys[sum % keys.length];
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  title: z.string().trim().min(1, "Title is required"),
  role: z.enum(["admin", "technician"]).default("technician"),
  specialties: z.string().trim().default(""),
});

export async function createTechnician(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can add technicians" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const existing = await queryOne(
    "SELECT id FROM technicians WHERE lower(email) = lower(?)",
    [d.email],
  );
  if (existing)
    return { ok: false, error: "A technician with that email already exists" };

  const specialties = d.specialties
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const id = uid("tech");
  await execute(
    `INSERT INTO technicians (id,name,email,role,title,specialties,accent,password_hash)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, d.name, d.email, d.role, d.title, JSON.stringify(specialties), accentFor(d.name), hashPassword(DEMO_PASSWORD)],
  );

  revalidatePath("/technicians");
  return { ok: true, data: { id } };
}
