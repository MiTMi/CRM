"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookmarkPlus, Check, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSavedView, deleteSavedView } from "@/lib/actions/views";
import { cn } from "@/lib/utils";

export interface SavedViewItem {
  id: string;
  name: string;
  params: string;
}

// Keys that make up a "view" — everything except pagination. Kept in sync with
// the server-side allowlist in actions/views.ts.
const VIEW_KEYS = [
  "q",
  "status",
  "priority",
  "assignee",
  "mine",
  "overdue",
  "tag",
  "sort",
  "dir",
];

/** Normalize a query string to just the view-defining keys, sorted, for compare. */
function normalize(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of VIEW_KEYS) {
    const value = params.get(key);
    if (value != null && value !== "") out.set(key, value);
  }
  out.sort();
  return out.toString();
}

export function SavedViews({ views }: { views: SavedViewItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const current = normalize(new URLSearchParams(searchParams.toString()));
  const hasFilters = current.length > 0;
  const activeView = views.find((v) => normalize(new URLSearchParams(v.params)) === current);

  function applyView(view: SavedViewItem) {
    startTransition(() => router.replace(`/tickets?${view.params}`, { scroll: false }));
  }

  function handleDelete(view: SavedViewItem) {
    startTransition(async () => {
      const res = await deleteSavedView(view.id);
      if (res.ok) {
        toast.success(`Deleted “${view.name}”`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn't delete view");
      }
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createSavedView({ name: trimmed, params: current });
      if (res.ok) {
        toast.success(`Saved view “${trimmed}”`);
        setName("");
        setSaveOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn't save view");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Star className={cn("size-4", activeView && "fill-current text-amber-500")} />
            )}
            <span className="truncate">{activeView ? activeView.name : "Views"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {views.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No saved views yet. Filter tickets, then save this view.
            </p>
          ) : (
            views.map((v) => (
              <DropdownMenuItem
                key={v.id}
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  applyView(v);
                }}
              >
                {activeView?.id === v.id ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <Star className="size-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{v.name}</span>
                <button
                  type="button"
                  aria-label={`Delete ${v.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!hasFilters || !!activeView}
            onSelect={(e) => {
              e.preventDefault();
              setSaveOpen(true);
            }}
          >
            <BookmarkPlus className="size-4" />
            {activeView ? "Current filters saved" : "Save current view…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
            <DialogDescription>
              Save the current filters and sort as a named view you can return to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="view-name">View name</Label>
            <Input
              id="view-name"
              value={name}
              autoFocus
              placeholder="e.g. My overdue tickets"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending || !name.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
