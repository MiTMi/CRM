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
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/entity-avatar";
import { ConfirmDelete } from "@/components/confirm-delete";
import { uploadAttachment, deleteAttachment } from "@/lib/actions/attachments";
import { formatBytes, relativeTime } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export interface TicketAttachment {
  id: string;
  filename: string;
  mime: string;
  size: number;
  uploaderName: string;
  uploaderAccent: string;
  createdAt: string;
}

function iconFor(mime: string, filename: string): LucideIcon {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (/\.(zip|tar|gz|7z)$/i.test(filename) || mime.includes("zip"))
    return FileArchive;
  return FileIcon;
}

export function AttachmentsSection({
  ticketId,
  attachments,
}: {
  ticketId: string;
  attachments: TicketAttachment[];
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    // Reset the input so the same file can be re-selected later.
    e.target.value = "";
    startTransition(async () => {
      const res = await uploadAttachment(ticketId, fd);
      if (res.ok) {
        toast.success("File attached");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4" />
          Attachments
          <span className="text-sm font-normal text-muted-foreground">
            · {attachments.length}
          </span>
        </CardTitle>
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
          Attach file
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onPick}
        />
      </CardHeader>
      <CardContent>
        {attachments.length > 0 ? (
          <ul className="divide-y">
            {attachments.map((a) => {
              const Icon = iconFor(a.mime, a.filename);
              return (
                <li
                  key={a.id}
                  className="group/att flex items-center gap-3 py-2.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/attachments/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {a.filename}
                    </a>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <EntityAvatar
                        name={a.uploaderName}
                        accent={a.uploaderAccent}
                        size="sm"
                        className="size-4"
                      />
                      {a.uploaderName}
                      <span>·</span>
                      {formatBytes(a.size)}
                      <span>·</span>
                      {relativeTime(a.createdAt)}
                    </div>
                  </div>
                  <div className="opacity-0 transition-opacity group-hover/att:opacity-100">
                    <ConfirmDelete
                      title="Delete attachment?"
                      description={`This permanently removes "${a.filename}".`}
                      successMessage="Attachment deleted"
                      action={() => deleteAttachment(a.id)}
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
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No files attached. Add screenshots, logs, or docs to this ticket.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
