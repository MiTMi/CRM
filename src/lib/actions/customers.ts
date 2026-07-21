"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import { AVATAR_TINTS } from "@/lib/data/constants";
import type { ActionResult } from "./types";

function now(): string {
  return new Date(NOW).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function requireUser() {
  return getCurrentUser();
}

async function logActivity(
  type: "customer_created" | "customer_updated" | "contact_added" | "note_added",
  actorId: string,
  customerId: string,
): Promise<void> {
  await execute(
    `INSERT INTO activities (id,type,actor_id,ticket_id,customer_id,meta,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [uid("act"), type, actorId, null, customerId, null, now()],
  );
}

/** Deterministic accent from the name so avatars are stable. */
function accentFor(name: string): string {
  const keys = Object.keys(AVATAR_TINTS);
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return keys[sum % keys.length];
}

// -- Create customer (with a primary contact) ------------------------------

const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  industry: z.string().trim().min(1, "Industry is required"),
  website: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  location: z.string().trim().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
  contactFirstName: z.string().trim().min(1, "Contact first name is required"),
  contactLastName: z.string().trim().default(""),
  contactEmail: z.string().trim().email("Enter a valid contact email"),
  contactRole: z.string().trim().default("Primary Contact"),
});

export async function createCustomer(
  input: z.input<typeof createCustomerSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can add customers" };

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const id = uid("cust");
  await execute(
    `INSERT INTO customers (id,name,industry,website,phone,location,status,accent,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, d.name, d.industry, d.website, d.phone, d.location, d.status, accentFor(d.name), now()],
  );

  await execute(
    `INSERT INTO contacts (id,customer_id,first_name,last_name,email,phone,role,is_primary)
     VALUES (?,?,?,?,?,?,?,1)`,
    [uid("contact"), id, d.contactFirstName, d.contactLastName, d.contactEmail, d.phone, d.contactRole],
  );

  await logActivity("customer_created", user.id, id);

  revalidatePath("/customers");
  revalidatePath("/");
  return { ok: true, data: { id } };
}

// -- Update customer -------------------------------------------------------

const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  industry: z.string().trim().min(1, "Industry is required"),
  website: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  location: z.string().trim().default(""),
  status: z.enum(["active", "inactive"]),
});

export async function updateCustomer(
  customerId: string,
  input: z.input<typeof updateCustomerSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can edit customers" };

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const changed = await execute(
    `UPDATE customers SET name=?, industry=?, website=?, phone=?, location=?, status=?
     WHERE id=?`,
    [d.name, d.industry, d.website, d.phone, d.location, d.status, customerId],
  );
  if (changed === 0) return { ok: false, error: "Customer not found" };

  await logActivity("customer_updated", user.id, customerId);

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
  return { ok: true, data: null };
}

// -- Create contact --------------------------------------------------------

const createContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().default(""),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().default(""),
  role: z.string().trim().default("Contact"),
  isPrimary: z.boolean().default(false),
});

export async function createContact(
  customerId: string,
  input: z.input<typeof createContactSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const customer = await queryOne("SELECT id FROM customers WHERE id = ?", [
    customerId,
  ]);
  if (!customer) return { ok: false, error: "Customer not found" };

  if (d.isPrimary) {
    await execute("UPDATE contacts SET is_primary = 0 WHERE customer_id = ?", [
      customerId,
    ]);
  }

  const id = uid("contact");
  await execute(
    `INSERT INTO contacts (id,customer_id,first_name,last_name,email,phone,role,is_primary)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, customerId, d.firstName, d.lastName, d.email, d.phone, d.role, d.isPrimary ? 1 : 0],
  );

  await logActivity("contact_added", user.id, customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, data: { id } };
}

// -- Update contact --------------------------------------------------------

const updateContactSchema = createContactSchema;

export async function updateContact(
  contactId: string,
  input: z.input<typeof updateContactSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const contact = await queryOne<{ customer_id: string }>(
    "SELECT customer_id FROM contacts WHERE id = ?",
    [contactId],
  );
  if (!contact) return { ok: false, error: "Contact not found" };

  if (d.isPrimary) {
    await execute(
      "UPDATE contacts SET is_primary = 0 WHERE customer_id = ? AND id != ?",
      [contact.customer_id, contactId],
    );
  }

  await execute(
    `UPDATE contacts SET first_name=?, last_name=?, email=?, phone=?, role=?, is_primary=?
     WHERE id=?`,
    [d.firstName, d.lastName, d.email, d.phone, d.role || "Contact", d.isPrimary ? 1 : 0, contactId],
  );

  revalidatePath(`/customers/${contact.customer_id}`);
  revalidatePath("/customers");
  return { ok: true, data: null };
}

// -- Delete contact --------------------------------------------------------

export async function deleteContact(contactId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const contact = await queryOne<{ customer_id: string }>(
    "SELECT customer_id FROM contacts WHERE id = ?",
    [contactId],
  );
  if (!contact) return { ok: false, error: "Contact not found" };

  const refs = await queryOne<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM tickets WHERE contact_id = ?",
    [contactId],
  );
  const n = refs?.n ?? 0;
  if (n > 0)
    return {
      ok: false,
      error: `Can't delete — this contact is on ${n} ticket${n === 1 ? "" : "s"}.`,
    };

  await execute("DELETE FROM contacts WHERE id = ?", [contactId]);

  revalidatePath(`/customers/${contact.customer_id}`);
  revalidatePath("/customers");
  return { ok: true, data: null };
}

// -- Add note --------------------------------------------------------------

const noteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty"),
});

export async function addNote(
  customerId: string,
  body: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = noteSchema.safeParse({ body });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note" };

  const customer = await queryOne("SELECT id FROM customers WHERE id = ?", [
    customerId,
  ]);
  if (!customer) return { ok: false, error: "Customer not found" };

  await execute(
    `INSERT INTO notes (id,customer_id,author_id,body,created_at)
     VALUES (?,?,?,?,?)`,
    [uid("note"), customerId, user.id, parsed.data.body, now()],
  );

  await logActivity("note_added", user.id, customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
  return { ok: true, data: null };
}

// -- Delete note -----------------------------------------------------------

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const note = await queryOne<{ customer_id: string }>(
    "SELECT customer_id FROM notes WHERE id = ?",
    [noteId],
  );
  if (!note) return { ok: false, error: "Note not found" };

  await execute("DELETE FROM notes WHERE id = ?", [noteId]);

  revalidatePath(`/customers/${note.customer_id}`);
  return { ok: true, data: null };
}
