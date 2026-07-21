import {
  LayoutDashboard,
  Ticket,
  Building2,
  Wrench,
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
  { title: "Customers", href: "/customers", icon: Building2 },
  { title: "Technicians", href: "/technicians", icon: Wrench },
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
