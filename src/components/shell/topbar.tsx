"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { CommandMenu } from "./command-menu";
import type { ActivityFeedItem } from "@/lib/data/types";
import {
  NewTicketDialog,
  type NewTicketOption,
} from "@/components/tickets/new-ticket-dialog";
import { mainNav } from "./nav";

function crumbForPath(pathname: string): { label: string; href?: string }[] {
  if (pathname === "/") return [{ label: "Dashboard" }];
  const seg = pathname.split("/").filter(Boolean);
  const top = mainNav.find((n) => n.href === "/" + seg[0]);
  const crumbs: { label: string; href?: string }[] = [];
  if (top) crumbs.push({ label: top.title, href: seg.length > 1 ? top.href : undefined });
  else crumbs.push({ label: seg[0] });
  if (seg.length > 1) crumbs.push({ label: "Detail" });
  return crumbs;
}

export function Topbar({
  customers,
  technicians,
  notifications,
}: {
  customers: NewTicketOption[];
  technicians: NewTicketOption[];
  notifications: ActivityFeedItem[];
}) {
  const pathname = usePathname();
  const crumbs = crumbForPath(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-5" />

      <nav className="hidden items-center gap-1.5 text-sm sm:flex">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/50">/</span>}
            {c.href ? (
              <Link
                href={c.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <CommandMenu />
        <Separator orientation="vertical" className="mx-0.5 !h-5" />
        <NotificationBell items={notifications} />
        <ThemeToggle />
        <NewTicketDialog customers={customers} technicians={technicians} />
      </div>
    </header>
  );
}
