"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  UserPlus,
  Building2,
  Pencil,
  Contact as ContactIcon,
  StickyNote,
  Flag,
  Paperclip,
  Tag as TagIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { ticketNumber } from "@/lib/data/constants";
import type { ActivityFeedItem, ActivityType } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, { icon: LucideIcon; tint: string }> = {
  ticket_created: { icon: PlusCircle, tint: "text-blue-600 dark:text-blue-400" },
  status_changed: { icon: RefreshCw, tint: "text-amber-600 dark:text-amber-400" },
  priority_changed: { icon: Flag, tint: "text-orange-600 dark:text-orange-400" },
  assigned: { icon: UserPlus, tint: "text-violet-600 dark:text-violet-400" },
  comment_added: { icon: MessageSquare, tint: "text-zinc-600 dark:text-zinc-400" },
  attachment_added: { icon: Paperclip, tint: "text-sky-600 dark:text-sky-400" },
  resolved: { icon: CheckCircle2, tint: "text-emerald-600 dark:text-emerald-400" },
  customer_created: { icon: Building2, tint: "text-indigo-600 dark:text-indigo-400" },
  customer_updated: { icon: Pencil, tint: "text-indigo-600 dark:text-indigo-400" },
  contact_added: { icon: ContactIcon, tint: "text-sky-600 dark:text-sky-400" },
  note_added: { icon: StickyNote, tint: "text-zinc-600 dark:text-zinc-400" },
  tagged: { icon: TagIcon, tint: "text-teal-600 dark:text-teal-400" },
  untagged: { icon: TagsIcon, tint: "text-zinc-600 dark:text-zinc-400" },
};

function summarize(item: ActivityFeedItem): string {
  const ref = item.ticketNumber ? ticketNumber(item.ticketNumber) : "";
  const who = item.customerName ?? "a customer";
  switch (item.type) {
    case "resolved":
      return `${item.actorName} resolved ${ref}`;
    case "status_changed":
      return `${item.actorName} moved ${ref} to ${item.meta?.to?.replace(/_/g, " ") ?? "a new status"}`;
    case "priority_changed":
      return `${item.actorName} set ${ref} to ${item.meta?.to ?? "a new"} priority`;
    case "assigned":
      return `${item.actorName} was assigned ${ref}`;
    case "comment_added":
      return `${item.actorName} commented on ${ref}`;
    case "attachment_added":
      return `${item.actorName} attached a file to ${ref}`;
    case "customer_created":
      return `${item.actorName} added customer ${who}`;
    case "customer_updated":
      return `${item.actorName} updated ${who}`;
    case "contact_added":
      return `${item.actorName} added a contact to ${who}`;
    case "note_added":
      return `${item.actorName} left a note on ${who}`;
    case "tagged":
      return `${item.actorName} tagged ${ref}${item.meta?.tag ? ` as “${item.meta.tag}”` : ""}`;
    case "untagged":
      return `${item.actorName} removed ${item.meta?.tag ? `“${item.meta.tag}” from ` : "a tag from "}${ref}`;
    default:
      return `${item.actorName} created ${ref}`;
  }
}

function hrefFor(item: ActivityFeedItem): string | null {
  if (item.ticketId) return `/tickets/${item.ticketId}`;
  if (item.customerId) return `/customers/${item.customerId}`;
  return null;
}

export function NotificationBell({ items }: { items: ActivityFeedItem[] }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-4.5" />
          {items.length > 0 && (
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2.5">
          Recent activity
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing yet.
            </p>
          ) : (
            items.map((item) => {
              const { icon: Icon, tint } = ICONS[item.type];
              const href = hrefFor(item);
              return (
                <button
                  key={item.id}
                  onClick={() => href && router.push(href)}
                  disabled={!href}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                    href ? "hover:bg-muted/60" : "cursor-default",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", tint)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{summarize(item)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {relativeTime(item.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
