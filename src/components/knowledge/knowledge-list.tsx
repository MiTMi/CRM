"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Paperclip, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EntityAvatar } from "@/components/entity-avatar";
import { EmptyState } from "@/components/empty-state";
import { relativeTime } from "@/lib/format";
import type { KnowledgeNoteWithMeta } from "@/lib/data/types";
import { cn } from "@/lib/utils";

function NoteCard({
  note,
  deleted,
}: {
  note: KnowledgeNoteWithMeta;
  deleted?: boolean;
}) {
  return (
    <Link href={`/knowledge/${note.id}`} className="group block">
      <Card className="h-full gap-0 p-5 transition-all hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight group-hover:text-primary">
            {note.title}
          </h3>
          {deleted && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300">
              <Trash2 className="size-3" />
              Deleted
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {note.body || "No content."}
        </p>
        <div className="mt-4 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <EntityAvatar
              name={note.authorName}
              accent={note.authorAccent}
              size="sm"
              className="size-5"
            />
            {note.authorName}
          </span>
          <span>·</span>
          <span>{relativeTime(deleted ? note.deletedAt! : note.updatedAt)}</span>
          {note.attachmentCount > 0 && (
            <span className="ml-auto flex items-center gap-1">
              <Paperclip className="size-3" />
              {note.attachmentCount}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function KnowledgeList({
  notes,
  deletedNotes,
  isAdmin,
}: {
  notes: KnowledgeNoteWithMeta[];
  deletedNotes: KnowledgeNoteWithMeta[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<"notes" | "archive">("notes");

  const source = tab === "archive" ? deletedNotes : notes;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? source.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.authorName.toLowerCase().includes(q),
      )
    : source;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center gap-1 border-b">
          {(["notes", "archive"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "notes" ? "Notes" : "Archive"}
              <span className="tnum text-xs text-muted-foreground">
                {t === "notes" ? notes.length : deletedNotes.length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} deleted={tab === "archive"} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={BookOpen}
            title={
              tab === "archive" ? "Nothing archived" : "No notes yet"
            }
            description={
              tab === "archive"
                ? "Deleted notes will appear here."
                : "Create the first note to start your team's knowledge base."
            }
          />
        </div>
      )}
    </div>
  );
}
