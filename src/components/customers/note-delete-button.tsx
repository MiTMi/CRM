"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteNote } from "@/lib/actions/customers";

export function NoteDeleteButton({ noteId }: { noteId: string }) {
  return (
    <ConfirmDelete
      title="Delete note?"
      description="This permanently removes the note."
      successMessage="Note deleted"
      action={() => deleteNote(noteId)}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete note"
        >
          <Trash2 className="size-3.5" />
        </Button>
      }
    />
  );
}
