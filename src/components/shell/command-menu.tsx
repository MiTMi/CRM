"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  LayoutDashboard,
  Loader2,
  Search,
  Ticket,
  Wrench,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ticketNumber } from "@/lib/data/constants";
import { searchWorkspaceAction } from "@/lib/actions/search";
import type { WorkspaceSearchResults } from "@/lib/data/types";

const pages = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Tickets", href: "/tickets", icon: Ticket },
  { title: "Customers", href: "/customers", icon: Building2 },
  { title: "Technicians", href: "/technicians", icon: Wrench },
];

const EMPTY: WorkspaceSearchResults = {
  tickets: [],
  customers: [],
  technicians: [],
  knowledge: [],
};

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<WorkspaceSearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          e.key === "/" &&
          (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement)
        )
          return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced server-side search — nothing is shipped to the client up front.
  React.useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const id = setTimeout(async () => {
      const res = await searchWorkspaceAction(term);
      if (!cancelled) {
        setResults(res);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const hasResults =
    results.tickets.length +
      results.customers.length +
      results.technicians.length +
      results.knowledge.length >
    0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 md:w-64"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="pointer-events-none hidden items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
        title="Search"
        description="Search tickets, customers, technicians and knowledge"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search tickets, customers, technicians, knowledge…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!query.trim() && (
            <CommandGroup heading="Navigation">
              {pages.map((p) => (
                <CommandItem
                  key={p.href}
                  value={`nav ${p.title}`}
                  onSelect={() => go(p.href)}
                >
                  <p.icon />
                  {p.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {query.trim() && loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          )}

          {query.trim() && !loading && !hasResults && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {results.tickets.length > 0 && (
            <CommandGroup heading="Tickets">
              {results.tickets.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`ticket-${t.id}`}
                  onSelect={() => go(`/tickets/${t.id}`)}
                >
                  <Ticket />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {ticketNumber(t.number)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.customers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Customers">
                {results.customers.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`customer-${c.id}`}
                    onSelect={() => go(`/customers/${c.id}`)}
                  >
                    <Building2 />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.industry}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.technicians.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Technicians">
                {results.technicians.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`tech-${t.id}`}
                    onSelect={() => go("/technicians")}
                  >
                    <Wrench />
                    <span className="truncate">{t.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t.title}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.knowledge.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Knowledge">
                {results.knowledge.map((k) => (
                  <CommandItem
                    key={k.id}
                    value={`knowledge-${k.id}`}
                    onSelect={() => go(`/knowledge/${k.id}`)}
                  >
                    <BookOpen />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{k.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {k.snippet}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
