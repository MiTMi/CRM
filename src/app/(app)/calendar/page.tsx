import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSlaPolicy, getTickets } from "@/lib/data/repository";
import { computeSla } from "@/lib/data/sla";
import { NOW } from "@/lib/data/clock";
import { PRIORITY_STYLES, ticketNumber } from "@/lib/data/constants";
import {
  WEEKDAYS,
  buildMonthGrid,
  monthLabel,
  parseMonth,
  shiftMonth,
  utcDayKey,
} from "@/lib/calendar";
import type { TicketWithRelations } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface DueTicket {
  ticket: TicketWithRelations;
  overdue: boolean;
  resolved: boolean;
  dueSoon: boolean;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const todayIso = new Date(NOW).toISOString().slice(0, 10);
  const defaultMonth = {
    year: new Date(NOW).getUTCFullYear(),
    month0: new Date(NOW).getUTCMonth(),
  };
  const { year, month0 } = parseMonth(str(sp.month), defaultMonth);

  const [tickets, slaPolicy] = await Promise.all([getTickets(), getSlaPolicy()]);

  // Bucket tickets by their SLA due day (UTC).
  const byDay = new Map<string, DueTicket[]>();
  let monthDue = 0;
  let monthOverdue = 0;
  for (const ticket of tickets) {
    const sla = computeSla(
      ticket.createdAt,
      ticket.priority,
      ticket.status,
      ticket.resolvedAt,
      ticket.customer.slaTier,
      slaPolicy,
    );
    const key = utcDayKey(sla.dueAt);
    const resolved = ticket.status === "resolved" || ticket.status === "closed";
    const entry: DueTicket = {
      ticket,
      overdue: sla.overdue,
      resolved,
      dueSoon: sla.state === "due_soon",
    };
    const arr = byDay.get(key) ?? [];
    arr.push(entry);
    byDay.set(key, arr);
    // month summary (visible month only)
    if (key.startsWith(`${year}-${String(month0 + 1).padStart(2, "0")}`)) {
      monthDue++;
      if (sla.overdue) monthOverdue++;
    }
  }

  const grid = buildMonthGrid(year, month0, todayIso);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Tickets on their SLA due date. Plan work and spot deadlines."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link
                href={`/calendar?month=${shiftMonth(year, month0, -1)}`}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">
              {monthLabel(year, month0)}
            </span>
            <Button variant="outline" size="icon" asChild>
              <Link
                href={`/calendar?month=${shiftMonth(year, month0, 1)}`}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">Today</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-4" />
          <span className="tnum font-medium text-foreground">{monthDue}</span> due
          this month
        </span>
        {monthOverdue > 0 && (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlarmClock className="size-4" />
            <span className="tnum font-medium">{monthOverdue}</span> overdue
          </span>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const due = (byDay.get(cell.iso) ?? []).sort(
              (a, b) =>
                Number(b.overdue) - Number(a.overdue) ||
                Number(a.resolved) - Number(b.resolved),
            );
            const shown = due.slice(0, 3);
            const extra = due.length - shown.length;
            return (
              <div
                key={cell.iso}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                  !cell.inMonth && "bg-muted/20",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      cell.isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : cell.inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-1">
                  {shown.map(({ ticket, overdue, resolved, dueSoon }) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      title={`${ticketNumber(ticket.number)} · ${ticket.title}`}
                      className={cn(
                        "flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px] transition-colors",
                        resolved
                          ? "border-border bg-transparent text-muted-foreground line-through hover:bg-muted"
                          : overdue
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300"
                            : dueSoon
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
                              : "border-border bg-muted/50 hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          PRIORITY_STYLES[ticket.priority].dot,
                        )}
                      />
                      <span className="truncate">{ticket.title}</span>
                    </Link>
                  ))}
                  {extra > 0 && (
                    <div className="px-1.5 text-[11px] text-muted-foreground">
                      +{extra} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
