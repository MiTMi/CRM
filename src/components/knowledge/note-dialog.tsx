"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledgeNote,
  updateKnowledgeNote,
} from "@/lib/actions/knowledge";

export function NoteDialog({
  mode,
  note,
  trigger,
}: {
  mode: "create" | "edit";
  note?: { id: string; title: string; body: string };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState(note?.title ?? "");
  const [body, setBody] = React.useState(note?.body ?? "");

  function reset() {
    if (mode === "edit" && note) {
      setTitle(note.title);
      setBody(note.body);
    } else {
      setTitle("");
      setBody("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "create") {
        const res = await createKnowledgeNote({ title, body });
        if (res.ok) {
          setOpen(false);
          toast.success("Note created");
          router.push(`/knowledge/${res.data.id}`);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await updateKnowledgeNote(note!.id, { title, body });
        if (res.ok) {
          setOpen(false);
          toast.success("Note updated");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ??
          (mode === "create" ? (
            <Button size="sm">
              <Plus className="size-4" />
              New note
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New note" : "Edit note"}
            </DialogTitle>
            <DialogDescription>
              Capture a note, idea, or how-to for the team.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="kn-title">Title</Label>
              <Input
                id="kn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="How to reset the VPN gateway"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kn-body">Content</Label>
              <Textarea
                id="kn-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your note or idea…"
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Create note" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
