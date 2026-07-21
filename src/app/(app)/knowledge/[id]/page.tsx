import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, History, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EntityAvatar } from "@/components/entity-avatar";
import { NoteDialog } from "@/components/knowledge/note-dialog";
import {
  NoteDeleteButton,
  NoteRestoreButton,
} from "@/components/knowledge/note-actions";
import { NoteAttachments } from "@/components/knowledge/note-attachments";
import {
  getKnowledgeNoteById,
  getKnowledgeAttachments,
  getKnowledgeNoteVersions,
} from "@/lib/data/knowledge";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const note = await getKnowledgeNoteById(id);
  return { title: note?.title ?? "Note" };
}

export default async function KnowledgeNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, currentUser] = await Promise.all([
    getKnowledgeNoteById(id),
    getCurrentUser(),
  ]);
  if (!note || !currentUser) notFound();

  const isAdmin = currentUser.role === "admin";
  const isDeleted = !!note.deletedAt;
  // Deleted notes are visible to admins only.
  if (isDeleted && !isAdmin) notFound();

  const canEdit =
    !isDeleted && (isAdmin || note.authorId === currentUser.id);

  const [attachments, versions] = await Promise.all([
    getKnowledgeAttachments(note.id),
    isAdmin ? getKnowledgeNoteVersions(note.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Knowledge
        </Link>
        <div className="flex items-center gap-2">
          {isDeleted && isAdmin && <NoteRestoreButton noteId={note.id} />}
          {canEdit && (
            <>
              <NoteDialog
                mode="edit"
                note={{ id: note.id, title: note.title, body: note.body }}
                trigger={
                  <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent/50">
                    <Pencil className="size-4" />
                    Edit
                  </button>
                }
              />
              <NoteDeleteButton noteId={note.id} />
            </>
          )}
        </div>
      </div>

      {isDeleted && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300">
          <Trash2 className="size-4" />
          This note was deleted {relativeTime(note.deletedAt!)}. Only admins can
          see it.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{note.title}</CardTitle>
          <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
            <EntityAvatar
              name={note.authorName}
              accent={note.authorAccent}
              size="sm"
              className="size-5"
            />
            {note.authorName}
            <span>·</span>
            <span>
              {note.updatedAt !== note.createdAt ? "updated" : "created"}{" "}
              {relativeTime(note.updatedAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {note.body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {note.body}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No content.</p>
          )}

          <Separator />

          <NoteAttachments
            noteId={note.id}
            attachments={attachments.map((a) => ({
              id: a.id,
              filename: a.filename,
              mime: a.mime,
              size: a.size,
              createdAt: a.createdAt,
            }))}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {/* Admin-only version history */}
      {isAdmin && versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Version history
              <span className="text-sm font-normal text-muted-foreground">
                · {versions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {versions.map((v) => (
                <li key={v.id} className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        v.action === "deleted"
                          ? "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300"
                          : "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
                      }
                    >
                      {v.action === "deleted" ? "Deleted" : "Edited"}
                    </span>
                    <span className="text-muted-foreground">
                      by {v.editorName} · {formatDateTime(v.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{v.title}</p>
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {v.body || "No content."}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
