import Link from "next/link";
import {
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
import { relativeTime } from "@/lib/format";
import type { ActivityFeedItem, ActivityType } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type FeedItem = ActivityFeedItem;

const ICONS: Record<ActivityType, { icon: LucideIcon; tint: string }> = {
  ticket_created: {
    icon: PlusCircle,
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  status_changed: {
    icon: RefreshCw,
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  assigned: {
    icon: UserPlus,
    tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
  comment_added: {
    icon: MessageSquare,
    tint: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  },
  attachment_added: {
    icon: Paperclip,
    tint: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  },
  resolved: {
    icon: CheckCircle2,
    tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  customer_created: {
    icon: Building2,
    tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  priority_changed: {
    icon: Flag,
    tint: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  },
  customer_updated: {
    icon: Pencil,
    tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  contact_added: {
    icon: ContactIcon,
    tint: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  },
  note_added: {
    icon: StickyNote,
    tint: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  },
  tagged: {
    icon: TagIcon,
    tint: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
  },
  untagged: {
    icon: TagsIcon,
    tint: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  },
};

function TicketRef({ item }: { item: FeedItem }) {
  if (!item.ticketId || !item.ticketNumber) return null;
  return (
    <Link
      href={`/tickets/${item.ticketId}`}
      className="font-medium text-foreground hover:underline"
    >
      TCK-{item.ticketNumber}
    </Link>
  );
}

function CustomerRef({ item }: { item: FeedItem }) {
  if (!item.customerId) return <span>a customer</span>;
  return (
    <Link
      href={`/customers/${item.customerId}`}
      className="font-medium text-foreground hover:underline"
    >
      {item.customerName ?? "a customer"}
    </Link>
  );
}

function description(item: FeedItem): React.ReactNode {
  switch (item.type) {
    case "resolved":
      return (
        <>
          resolved <TicketRef item={item} />
        </>
      );
    case "status_changed":
      return (
        <>
          moved <TicketRef item={item} /> to{" "}
          {item.meta?.to?.replace(/_/g, " ") ?? "in progress"}
        </>
      );
    case "priority_changed":
      return (
        <>
          set <TicketRef item={item} /> to {item.meta?.to ?? "a new"} priority
        </>
      );
    case "assigned":
      return (
        <>
          was assigned <TicketRef item={item} />
        </>
      );
    case "comment_added":
      return (
        <>
          commented on <TicketRef item={item} />
        </>
      );
    case "attachment_added":
      return (
        <>
          attached a file to <TicketRef item={item} />
        </>
      );
    case "customer_created":
      return (
        <>
          added customer <CustomerRef item={item} />
        </>
      );
    case "customer_updated":
      return (
        <>
          updated <CustomerRef item={item} />
        </>
      );
    case "contact_added":
      return (
        <>
          added a contact to <CustomerRef item={item} />
        </>
      );
    case "note_added":
      return (
        <>
          left a note on <CustomerRef item={item} />
        </>
      );
    case "tagged":
      return (
        <>
          tagged <TicketRef item={item} />
          {item.meta?.tag ? ` as “${item.meta.tag}”` : ""}
        </>
      );
    case "untagged":
      return (
        <>
          removed {item.meta?.tag ? `“${item.meta.tag}” from ` : "a tag from "}
          <TicketRef item={item} />
        </>
      );
    default:
      return (
        <>
          created <TicketRef item={item} />
        </>
      );
  }
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <ol className="relative space-y-1">
      {items.map((item, i) => {
        const { icon: Icon, tint } = ICONS[item.type];
        const last = i === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-1">
            {!last && (
              <span className="absolute left-4 top-8 h-full w-px -translate-x-1/2 bg-border" />
            )}
            <span
              className={cn(
                "z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                tint,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{item.actorName}</span>{" "}
                <span className="text-muted-foreground">
                  {description(item)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {relativeTime(item.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
