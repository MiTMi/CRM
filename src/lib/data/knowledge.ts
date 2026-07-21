import "server-only";
import { query, queryOne } from "@/lib/db";
import type {
  KnowledgeAttachment,
  KnowledgeNote,
  KnowledgeNoteVersion,
  KnowledgeNoteWithMeta,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapNote(r: any): KnowledgeNoteWithMeta {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
    deletedBy: r.deleted_by ?? null,
    authorName: r.author_name ?? "Unknown",
    authorAccent: r.author_accent ?? "indigo",
    attachmentCount: r.attachment_count ?? 0,
  };
}

function mapAttachment(r: any): KnowledgeAttachment {
  return {
    id: r.id,
    noteId: r.note_id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    uploaderId: r.uploader_id,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const NOTE_SELECT = `
  SELECT n.*, t.name AS author_name, t.accent AS author_accent,
    (SELECT COUNT(*)::int FROM knowledge_attachments a WHERE a.note_id = n.id) AS attachment_count
  FROM knowledge_notes n JOIN technicians t ON t.id = n.author_id
`;

export async function getKnowledgeNotes(): Promise<KnowledgeNoteWithMeta[]> {
  return (
    await query(`${NOTE_SELECT} WHERE n.deleted_at IS NULL ORDER BY n.updated_at DESC`)
  ).map(mapNote);
}

/** Soft-deleted notes — admin archive only. */
export async function getDeletedKnowledgeNotes(): Promise<
  KnowledgeNoteWithMeta[]
> {
  return (
    await query(
      `${NOTE_SELECT} WHERE n.deleted_at IS NOT NULL ORDER BY n.deleted_at DESC`,
    )
  ).map(mapNote);
}

export async function getKnowledgeNoteById(
  id: string,
): Promise<KnowledgeNoteWithMeta | null> {
  const r = await queryOne(`${NOTE_SELECT} WHERE n.id = ?`, [id]);
  return r ? mapNote(r) : null;
}

/** Bare note row (with author_id) — for permission checks in actions. */
export async function getKnowledgeNoteRow(
  id: string,
): Promise<KnowledgeNote | null> {
  const r = await queryOne<Record<string, unknown>>(
    "SELECT * FROM knowledge_notes WHERE id = ?",
    [id],
  );
  if (!r) return null;
  return {
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    authorId: r.author_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    deletedAt: (r.deleted_at as string) ?? null,
    deletedBy: (r.deleted_by as string) ?? null,
  };
}

export async function getKnowledgeAttachments(
  noteId: string,
): Promise<KnowledgeAttachment[]> {
  return (
    await query(
      "SELECT * FROM knowledge_attachments WHERE note_id = ? ORDER BY created_at DESC",
      [noteId],
    )
  ).map(mapAttachment);
}

export async function getKnowledgeAttachmentRecord(
  id: string,
): Promise<(KnowledgeAttachment & { path: string }) | null> {
  const r = await queryOne("SELECT * FROM knowledge_attachments WHERE id = ?", [
    id,
  ]);
  if (!r) return null;
  return { ...mapAttachment(r), path: (r as Record<string, unknown>).path as string };
}

/** Version history (prior states) — surfaced to admins only. */
export async function getKnowledgeNoteVersions(
  noteId: string,
): Promise<KnowledgeNoteVersion[]> {
  return (
    await query(
      `SELECT v.*, t.name AS editor_name
       FROM knowledge_note_versions v LEFT JOIN technicians t ON t.id = v.editor_id
       WHERE v.note_id = ? ORDER BY v.created_at DESC`,
      [noteId],
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((r: any) => ({
    id: r.id,
    noteId: r.note_id,
    title: r.title,
    body: r.body,
    action: r.action,
    editorId: r.editor_id,
    editorName: r.editor_name ?? "Unknown",
    createdAt: r.created_at,
  }));
}
