"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Search,
  UserCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityAvatar } from "@/components/entity-avatar";
import { StatusBadge, PriorityTag, CategoryBadge } from "@/components/tags";
import { EmptyState } from "@/components/empty-state";
import {
  PRIORITY_ORDER,
  STATUS_STYLES,
  ticketNumber,
} from "@/lib/data/constants";
import { relativeTime } from "@/lib/format";
import { computeSla, formatSlaRemaining } from "@/lib/data/sla";
import type {
  StatusCounts,
  TicketCategory,
  TicketPriority,
  TicketSort,
  TicketStatus,
  SortDir,
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

export interface TicketRow {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAccent: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TicketFilters {
  q: string;
  status: string;
  priority: string;
  assignee: string;
  mine: boolean;
  overdue: boolean;
  sort: TicketSort;
  dir: SortDir;
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_customer", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function TicketTable({
  rows,
  total,
  page,
  pageCount,
  pageSize,
  statusCounts,
  filters,
  technicians,
}: {
  rows: TicketRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  statusCounts: StatusCounts;
  filters: TicketFilters;
  technicians: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Push a param patch to the URL (server re-queries). Empty/default values are
  // removed to keep URLs clean and shareable. Filter changes reset to page 1.
  const setParams = React.useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all" || v === "false") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage && !("page" in patch)) params.delete("page");
      startTransition(() =>
        router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
      );
    },
    [router, pathname, searchParams],
  );

  // Debounced search: local input state synced to the URL.
  const [search, setSearch] = React.useState(filters.q);
  React.useEffect(() => setSearch(filters.q), [filters.q]);
  React.useEffect(() => {
    if (search === filters.q) return;
    const id = setTimeout(() => setParams({ q: search }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleSort(col: TicketSort) {
    // First click: created → newest first (desc); title/priority → asc, which
    // for priority means most-severe first (critical → low).
    const dir: SortDir =
      filters.sort === col
        ? filters.dir === "desc"
          ? "asc"
          : "desc"
        : col === "created"
          ? "desc"
          : "asc";
    setParams({ sort: col === "created" ? null : col, dir: dir === "desc" ? null : dir });
  }

  function SortHeader({ label, col }: { label: string; col: TicketSort }) {
    const active = filters.sort === col;
    return (
      <button
        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground"
        onClick={() => toggleSort(col)}
      >
        {label}
        {active ? (
          filters.dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    );
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParams({ status: t.value })}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              filters.status === t.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.value !== "all" && (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  STATUS_STYLES[t.value as TicketStatus].dot,
                )}
              />
            )}
            {t.label}
            <span className="tnum text-xs text-muted-foreground">
              {statusCounts[t.value as keyof StatusCounts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, customer, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.priority}
          onValueChange={(v) => setParams({ priority: v })}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.mine ? "all" : filters.assignee}
          onValueChange={(v) => setParams({ assignee: v, mine: null })}
          disabled={filters.mine}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={filters.mine ? "default" : "outline"}
          className="w-full sm:w-auto"
          onClick={() =>
            setParams({ mine: filters.mine ? null : "true", assignee: null })
          }
        >
          <UserCheck className="size-4" />
          My Tickets
        </Button>
        <Button
          variant={filters.overdue ? "destructive" : "outline"}
          className="w-full sm:w-auto"
          onClick={() => setParams({ overdue: filters.overdue ? null : "true" })}
        >
          <AlarmClock className="size-4" />
          Overdue
        </Button>
      </div>

      {/* Table */}
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-card transition-opacity",
          isPending && "opacity-60",
        )}
        aria-busy={isPending}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">
                  <SortHeader label="Ticket" col="title" />
                </TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Priority" col="priority" />
                </TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Due (SLA)</TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Created" col="created" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/tickets/${t.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{t.title}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticketNumber(t.number)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.customerName}
                    </TableCell>
                    <TableCell>
                      <PriorityTag priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={t.category} />
                    </TableCell>
                    <TableCell>
                      {t.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <EntityAvatar
                            name={t.assigneeName}
                            accent={t.assigneeAccent ?? "indigo"}
                            size="sm"
                          />
                          <span className="hidden text-sm lg:inline">
                            {t.assigneeName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const sla = computeSla(
                          t.createdAt,
                          t.priority,
                          t.status,
                          t.resolvedAt,
                        );
                        const tone =
                          sla.state === "overdue" || sla.state === "breached"
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : sla.state === "due_soon"
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : "text-muted-foreground";
                        return (
                          <span className={cn("text-sm", tone)}>
                            {formatSlaRemaining(sla)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {relativeTime(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={Inbox}
                      title="No tickets found"
                      description="Try adjusting your filters or search terms."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="tnum font-medium text-foreground">
              {from}–{to}
            </span>{" "}
            of{" "}
            <span className="tnum font-medium text-foreground">{total}</span>{" "}
            tickets
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setParams({ page: String(page - 1) }, false)}
                disabled={page <= 1 || isPending}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setParams({ page: String(page + 1) }, false)}
                disabled={page >= pageCount || isPending}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
