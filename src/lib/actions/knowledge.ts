"use server";

import { z } from "zod";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getKnowledgeNoteRow,
  getKnowledgeAttachmentRecord,
} from "@/lib/data/knowledge";
import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
  ensureUploadsDir,
  extensionOf,
} from "@/lib/storage";
import type { KnowledgeNote } from "@/lib/data/types";
import type { Technician } from "@/lib/data/types";
import type { ActionResult } from "./types";

function now(): string {
  return new Date(NOW).toISOString();
}
function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Anyone with an account is a technician or admin, so any signed-in user may
 *  create; editing/deleting is limited to the author or an admin. */
function canEdit(user: Technician, note: KnowledgeNote): boolean {
  return user.role === "admin" || note.authorId === user.id;
}

async function snapshot(
  note: KnowledgeNote,
  action: "edited" | "deleted",
  editorId: string,
) {
  await execute(
    `INSERT INTO knowledge_note_versions (id,note_id,title,body,action,editor_id,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [uid("knv"), note.id, note.title, note.body, action, editorId, now()],
  );
}

const noteSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  body: z.string().trim().default(""),
});

export async function createKnowledgeNote(
  input: z.input<typeof noteSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const id = uid("kn");
  const ts = now();
  await execute(
    `INSERT INTO knowledge_notes (id,title,body,author_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?)`,
    [id, parsed.data.title, parsed.data.body, user.id, ts, ts],
  );

  revalidatePath("/knowledge");
  return { ok: true, data: { id } };
}

export async function updateKnowledgeNote(
  id: string,
  input: z.input<typeof noteSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const note = await getKnowledgeNoteRow(id);
  if (!note || note.deletedAt) return { ok: false, error: "Note not found" };
  if (!canEdit(user, note))
    return { ok: false, error: "You can only edit your own notes" };

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Snapshot the prior state before overwriting, for the admin audit trail.
  await snapshot(note, "edited", user.id);
  await execute(
    "UPDATE knowledge_notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
    [parsed.data.title, parsed.data.body, now(), id],
  );

  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${id}`);
  return { ok: true, data: null };
}

export async function deleteKnowledgeNote(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const note = await getKnowledgeNoteRow(id);
  if (!note || note.deletedAt) return { ok: false, error: "Note not found" };
  if (!canEdit(user, note))
    return { ok: false, error: "You can only delete your own notes" };

  // Snapshot before soft-deleting so admins can still see the content + history.
  await snapshot(note, "deleted", user.id);
  await execute(
    "UPDATE knowledge_notes SET deleted_at = ?, deleted_by = ? WHERE id = ?",
    [now(), user.id, id],
  );

  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${id}`);
  return { ok: true, data: null };
}

export async function restoreKnowledgeNote(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (user.role !== "admin")
    return { ok: false, error: "Only admins can restore notes" };

  const changed = await execute(
    "UPDATE knowledge_notes SET deleted_at = NULL, deleted_by = NULL, updated_at = ? WHERE id = ?",
    [now(), id],
  );
  if (changed === 0) return { ok: false, error: "Note not found" };

  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${id}`);
  return { ok: true, data: null };
}

// -- Attachments -----------------------------------------------------------

export async function uploadKnowledgeAttachment(
  noteId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const note = await getKnowledgeNoteRow(noteId);
  if (!note || note.deletedAt) return { ok: false, error: "Note not found" };
  if (!canEdit(user, note))
    return { ok: false, error: "You can only edit your own notes" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "No file selected" };
  if (file.size > MAX_UPLOAD_BYTES)
    return { ok: false, error: "File is too large (max 10 MB)" };
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext))
    return { ok: false, error: `.${ext || "?"} files aren't allowed` };

  const id = uid("katt");
  const diskName = ext ? `${id}.${ext}` : id;
  ensureUploadsDir();
  await writeFile(join(UPLOADS_DIR, diskName), Buffer.from(await file.arrayBuffer()));

  await execute(
    `INSERT INTO knowledge_attachments (id,note_id,filename,mime,size,path,uploader_id,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id, noteId, file.name, file.type || "application/octet-stream",
      file.size, diskName, user.id, now(),
    ],
  );

  revalidatePath(`/knowledge/${noteId}`);
  return { ok: true, data: { id } };
}

export async function deleteKnowledgeAttachment(
  id: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rec = await getKnowledgeAttachmentRecord(id);
  if (!rec) return { ok: false, error: "Attachment not found" };
  const note = await getKnowledgeNoteRow(rec.noteId);
  if (!note) return { ok: false, error: "Note not found" };
  if (!canEdit(user, note))
    return { ok: false, error: "You can only edit your own notes" };

  try {
    await unlink(join(UPLOADS_DIR, rec.path));
  } catch {
    // no-op
  }
  await execute("DELETE FROM knowledge_attachments WHERE id = ?", [id]);

  revalidatePath(`/knowledge/${rec.noteId}`);
  return { ok: true, data: null };
}
