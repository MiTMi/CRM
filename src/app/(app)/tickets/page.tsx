import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  TicketTable,
  type TicketRow,
  type TicketFilters,
} from "@/components/tickets/ticket-table";
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog";
import {
  getAllTags,
  getCustomers,
  getSavedViews,
  getSlaPolicy,
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
  const currentUser = await getCurrentUser();
  const [technicians, customers, allTags, savedViews, slaPolicy] =
    await Promise.all([
      getTechnicians(),
      getCustomers(),
      getAllTags(),
      currentUser ? getSavedViews(currentUser.id) : Promise.resolve([]),
      getSlaPolicy(),
    ]);

  const filters: TicketFilters = {
    q: str(sp.q) ?? "",
    status: str(sp.status) ?? "all",
    priority: str(sp.priority) ?? "all",
    assignee: str(sp.assignee) ?? "all",
    tag: str(sp.tag) ?? "all",
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
    tagId: filters.tag,
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
    customerTier: t.customer.slaTier,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ?? null,
    assigneeAccent: t.assignee?.accent ?? null,
    tags: t.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
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
        tags={allTags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
        savedViews={savedViews.map((v) => ({
          id: v.id,
          name: v.name,
          params: v.params,
        }))}
        slaHours={slaPolicy}
      />
    </div>
  );
}
