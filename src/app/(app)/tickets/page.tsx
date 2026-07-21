import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  TicketTable,
  type TicketRow,
  type TicketFilters,
} from "@/components/tickets/ticket-table";
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog";
import {
  getCustomers,
  getTechnicians,
  getTicketsPage,
} from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  SortDir,
  TicketPriority,
  TicketSort,
  TicketStatus,
} from "@/lib/data/types";

export const metadata: Metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [currentUser, technicians, customers] = await Promise.all([
    getCurrentUser(),
    getTechnicians(),
    getCustomers(),
  ]);

  const filters: TicketFilters = {
    q: str(sp.q) ?? "",
    status: str(sp.status) ?? "all",
    priority: str(sp.priority) ?? "all",
    assignee: str(sp.assignee) ?? "all",
    mine: str(sp.mine) === "true",
    overdue: str(sp.overdue) === "true",
    sort: (str(sp.sort) as TicketSort) ?? "created",
    dir: (str(sp.dir) as SortDir) ?? "desc",
  };

  const result = await getTicketsPage({
    query: filters.q,
    status: filters.status as TicketStatus | "all",
    priority: filters.priority as TicketPriority | "all",
    assigneeId: filters.assignee,
    mine: filters.mine ? currentUser?.id : undefined,
    overdue: filters.overdue,
    sort: filters.sort,
    dir: filters.dir,
    page: Number(str(sp.page)) || 1,
  });

  const rows: TicketRow[] = result.rows.map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    customerName: t.customer.name,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ?? null,
    assigneeAccent: t.assignee?.accent ?? null,
    createdAt: t.createdAt,
    resolvedAt: t.resolvedAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Track, assign, and resolve IT support requests."
        actions={
          <NewTicketDialog
            customers={customers.map((c) => ({ id: c.id, label: c.name }))}
            technicians={technicians.map((t) => ({ id: t.id, label: t.name }))}
          />
        }
      />
      <TicketTable
        rows={rows}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        pageSize={result.pageSize}
        statusCounts={result.statusCounts}
        filters={filters}
        technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
