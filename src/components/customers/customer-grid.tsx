"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { CustomerCard } from "./customer-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomerWithStats } from "@/lib/data/types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export function CustomerGrid({
  customers,
  total,
  page,
  pageCount,
  pageSize,
  filters,
}: {
  customers: CustomerWithStats[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  filters: { q: string; status: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const setParams = React.useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage && !("page" in patch)) params.delete("page");
      startTransition(() =>
        router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
      );
    },
    [router, pathname, searchParams],
  );

  const [search, setSearch] = React.useState(filters.q);
  React.useEffect(() => setSearch(filters.q), [filters.q]);
  React.useEffect(() => {
    if (search === filters.q) return;
    const id = setTimeout(() => setParams({ q: search }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setParams({ status: f.value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filters.status === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {customers.length > 0 ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            isPending && "opacity-60",
          )}
          aria-busy={isPending}
        >
          {customers.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Building2}
            title="No customers found"
            description="Try a different search or filter."
          />
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="tnum font-medium text-foreground">
              {from}–{to}
            </span>{" "}
            of{" "}
            <span className="tnum font-medium text-foreground">{total}</span>{" "}
            customers
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
