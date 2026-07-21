import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CustomerGrid } from "@/components/customers/customer-grid";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { getCustomersPage } from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import type { CustomerStatus } from "@/lib/data/types";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const filters = {
    q: str(sp.q) ?? "",
    status: str(sp.status) ?? "all",
  };

  const result = await getCustomersPage({
    query: filters.q,
    status: filters.status as CustomerStatus | "all",
    page: Number(str(sp.page)) || 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage the companies and accounts you support."
        actions={isAdmin ? <CustomerDialog mode="create" /> : undefined}
      />
      <CustomerGrid
        customers={result.rows}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        pageSize={result.pageSize}
        filters={filters}
      />
    </div>
  );
}
