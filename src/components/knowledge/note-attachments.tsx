"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  File as FileIcon,
  FileArchive,
  FileImage,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import {
  uploadKnowledgeAttachment,
  deleteKnowledgeAttachment,
} from "@/lib/actions/knowledge";
import { formatBytes, relativeTime } from "@/lib/format";

export interface NoteAttachment {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
}

function iconFor(mime: string, filename: string): LucideIcon {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (/\.(zip|tar|gz|7z)$/i.test(filename) || mime.includes("zip"))
    return FileArchive;
  return FileIcon;
}

export function NoteAttachments({
  noteId,
  attachments,
  canEdit,
}: {
  noteId: string;
  attachments: NoteAttachment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    e.target.value = "";
    startTransition(async () => {
      const res = await uploadKnowledgeAttachment(noteId, fd);
      if (res.ok) {
        toast.success("File attached");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4" />
          Attachments
          <span className="font-normal text-muted-foreground">
            · {attachments.length}
          </span>
        </h3>
        {canEdit && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              Attach
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
          </>
        )}
      </div>

      {attachments.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {attachments.map((a) => {
            const Icon = iconFor(a.mime, a.filename);
            return (
              <li key={a.id} className="group/att flex items-center gap-3 px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/knowledge-attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {a.filename}
                  </a>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(a.size)} · {relativeTime(a.createdAt)}
                  </div>
                </div>
                {canEdit && (
                  <div className="opacity-0 transition-opacity group-hover/att:opacity-100">
                    <ConfirmDelete
                      title="Delete attachment?"
                      description={`This permanently removes "${a.filename}".`}
                      successMessage="Attachment deleted"
                      action={() => deleteKnowledgeAttachment(a.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${a.filename}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No files attached{canEdit ? " — add docs or images." : "."}
        </p>
      )}
    </div>
  );
}
