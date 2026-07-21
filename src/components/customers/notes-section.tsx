"use client";

import * as React from "react";
import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntityAvatar } from "@/components/entity-avatar";
import { EmptyState } from "@/components/empty-state";
import { NoteDeleteButton } from "./note-delete-button";
import { addNote } from "@/lib/actions/customers";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CustomerNote {
  id: string;
  authorName: string;
  authorAccent: string;
  body: string;
  createdAt: string;
  pending?: boolean;
}

export function NotesSection({
  customerId,
  notes,
  currentUser,
}: {
  customerId: string;
  notes: CustomerNote[];
  currentUser: { name: string; accent: string };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const idRef = React.useRef(0);

  const [optimisticNotes, addOptimistic] = useOptimistic(
    notes,
    (state, next: CustomerNote) => [next, ...state],
  );

  function submit() {
    const body = value.trim();
    if (!body || isPending) return;
    setValue("");
    setOpen(false);
    startTransition(async () => {
      addOptimistic({
        id: `optimistic-${idRef.current++}`,
        authorName: currentUser.name,
        authorAccent: currentUser.accent,
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      });
      const res = await addNote(customerId, body);
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to add note");
        setValue(body);
        setOpen(true);
      }
    });
  }

  return (
    <div className="space-y-4">
      {open ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a note about this customer…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submit} disabled={!value.trim()}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setValue("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add note
        </Button>
      )}

      {optimisticNotes.length > 0 ? (
        <ol className="space-y-3">
          {optimisticNotes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "group/note rounded-lg border bg-muted/30 p-4 transition-opacity",
                note.pending && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{note.body}</p>
                {!note.pending && (
                  <div className="opacity-0 transition-opacity group-hover/note:opacity-100">
                    <NoteDeleteButton noteId={note.id} />
                  </div>
                )}
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <EntityAvatar
                  name={note.authorName}
                  accent={note.authorAccent}
                  size="sm"
                  className="size-5"
                />
                {note.authorName} ·{" "}
                {note.pending ? "Saving…" : relativeTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={Users}
          title="No notes yet"
          description="Add a note to keep context on this account."
        />
      )}
    </div>
  );
}
