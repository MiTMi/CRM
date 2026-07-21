"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagChip } from "@/components/tags";
import { TAG_COLOR_ORDER, tagColor } from "@/lib/data/constants";
import {
  addTagToTicket,
  createTag,
  deleteTag,
  removeTagFromTicket,
} from "@/lib/actions/tags";
import type { Tag } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function TicketTagsEditor({
  ticketId,
  tags,
  allTags,
  canManage,
}: {
  ticketId: string;
  /** Tags currently on this ticket. */
  tags: Tag[];
  /** Every tag in the workspace (for the picker). */
  allTags: Tag[];
  /** Whether the current user may delete tags workspace-wide (admin). */
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const assignedIds = new Set(tags.map((t) => t.id));
  const trimmed = search.trim();
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (success) toast.success(success);
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  function toggle(tag: Tag) {
    if (assignedIds.has(tag.id)) {
      run(() => removeTagFromTicket(ticketId, tag.id));
    } else {
      run(() => addTagToTicket(ticketId, tag.id), `Tagged “${tag.name}”`);
    }
  }

  function handleCreate() {
    const name = trimmed;
    if (!name) return;
    // Cycle palette colors by current tag count so new tags look varied.
    const color = TAG_COLOR_ORDER[allTags.length % TAG_COLOR_ORDER.length];
    startTransition(async () => {
      const res = await createTag({ name, color });
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't create tag");
        return;
      }
      const link = await addTagToTicket(ticketId, res.data.id);
      if (!link.ok) {
        toast.error(link.error ?? "Couldn't tag ticket");
        return;
      }
      setSearch("");
      toast.success(`Created & tagged “${name}”`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag.id} className="group/tag relative inline-flex">
          <TagChip tag={tag} className="pr-5" />
          <button
            type="button"
            aria-label={`Remove ${tag.name}`}
            disabled={pending}
            onClick={() => run(() => removeTagFromTicket(ticketId, tag.id))}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 rounded-full border-dashed px-2 text-xs text-muted-foreground"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
            {tags.length === 0 ? "Add tag" : "Tag"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command
            filter={(value, s) =>
              value.toLowerCase().includes(s.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput
              placeholder="Search or create…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {!trimmed && allTags.length === 0 && (
                <CommandEmpty>No tags yet. Type to create one.</CommandEmpty>
              )}
              <CommandGroup>
                {allTags.map((tag) => {
                  const active = assignedIds.has(tag.id);
                  const c = tagColor(tag.color);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => toggle(tag)}
                      className="gap-2"
                    >
                      <span className={cn("size-2 rounded-full", c.dot)} />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {active && <Check className="size-4 text-primary" />}
                      {canManage && (
                        <button
                          type="button"
                          aria-label={`Delete tag ${tag.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            run(
                              () => deleteTag(tag.id),
                              `Deleted tag “${tag.name}”`,
                            );
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {trimmed && !exactMatch && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem value={`create-${trimmed}`} onSelect={handleCreate}>
                      <TagIcon className="size-4" />
                      Create “{trimmed}”
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
