"use server";

import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { queryOne, execute } from "@/lib/db";
import { NOW } from "@/lib/data/clock";
import { getCurrentUser } from "@/lib/auth/session";
import { getAttachmentRecord } from "@/lib/data/repository";
import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
  ensureUploadsDir,
  extensionOf,
} from "@/lib/storage";
import type { ActionResult } from "./types";

function now(): string {
  return new Date(NOW).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function logAttachmentActivity(actorId: string, ticketId: string) {
  await execute(
    `INSERT INTO activities (id,type,actor_id,ticket_id,customer_id,meta,created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [uid("act"), "attachment_added", actorId, ticketId, null, null, now()],
  );
}

export async function uploadAttachment(
  ticketId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ticket = await queryOne("SELECT id FROM tickets WHERE id = ?", [ticketId]);
  if (!ticket) return { ok: false, error: "Ticket not found" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is too large (max 10 MB)" };
  }
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `.${ext || "?"} files aren't allowed` };
  }

  const id = uid("att");
  const diskName = ext ? `${id}.${ext}` : id;
  ensureUploadsDir();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOADS_DIR, diskName), buffer);

  await execute(
    `INSERT INTO attachments (id,ticket_id,filename,mime,size,path,uploader_id,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      ticketId,
      file.name,
      file.type || "application/octet-stream",
      file.size,
      diskName,
      user.id,
      now(),
    ],
  );

  await logAttachmentActivity(user.id, ticketId);

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rec = await getAttachmentRecord(id);
  if (!rec) return { ok: false, error: "Attachment not found" };

  // Remove the file first; ignore if it's already gone.
  try {
    await unlink(join(UPLOADS_DIR, rec.path));
  } catch {
    // no-op
  }
  await execute("DELETE FROM attachments WHERE id = ?", [id]);

  revalidatePath(`/tickets/${rec.ticketId}`);
  return { ok: true, data: null };
}
