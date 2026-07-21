import Link from "next/link";
import { AlarmClock } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { StatusBadge } from "@/components/tags";
import { PRIORITY_STYLES, ticketNumber } from "@/lib/data/constants";
import { relativeTime } from "@/lib/format";
import { computeSla, type SlaPolicy } from "@/lib/data/sla";
import type { TicketWithRelations } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function TicketQueueItem({
  ticket,
  slaHours,
}: {
  ticket: TicketWithRelations;
  slaHours?: SlaPolicy;
}) {
  const sla = computeSla(
    ticket.createdAt,
    ticket.priority,
    ticket.status,
    ticket.resolvedAt,
    ticket.customer.slaTier,
    slaHours,
  );
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-muted/60"
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          PRIORITY_STYLES[ticket.priority].dot,
        )}
        title={`${PRIORITY_STYLES[ticket.priority].label} priority`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium group-hover:text-foreground">
            {ticket.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{ticketNumber(ticket.number)}</span>
          <span>·</span>
          <span className="truncate">{ticket.customer.name}</span>
        </div>
      </div>
      {sla.overdue && (
        <span className="hidden items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 sm:inline-flex dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300">
          <AlarmClock className="size-3" />
          Overdue
        </span>
      )}
      <StatusBadge status={ticket.status} className="hidden sm:inline-flex" />
      {ticket.assignee ? (
        <EntityAvatar
          name={ticket.assignee.name}
          accent={ticket.assignee.accent}
          size="sm"
        />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
          —
        </span>
      )}
      <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground md:inline">
        {relativeTime(ticket.createdAt)}
      </span>
    </Link>
  );
}
