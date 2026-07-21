import {
  LayoutDashboard,
  Ticket,
  CalendarDays,
  Building2,
  Wrench,
  BookOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Tickets", href: "/tickets", icon: Ticket },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Customers", href: "/customers", icon: Building2 },
  { title: "Technicians", href: "/technicians", icon: Wrench },
  { title: "Knowledge", href: "/knowledge", icon: BookOpen },
];

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

/** Page title lookup for the topbar breadcrumb. */
export function sectionForPath(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const seg = pathname.split("/")[1] ?? "";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}
