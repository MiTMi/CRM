// ---------------------------------------------------------------------------
// UI config maps for enums. Every badge, dot, filter and chart color reads
// from here so status/priority styling stays consistent (light + dark).
// ---------------------------------------------------------------------------

import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  CustomerStatus,
} from "./types";

export interface EnumStyle {
  label: string;
  /** Soft tinted badge classes (light + dark variants) */
  badge: string;
  /** Solid dot color */
  dot: string;
  /** Solid text color for accents */
  text: string;
  /** Chart fill (raw color for recharts) */
  chart: string;
}

export const STATUS_STYLES: Record<TicketStatus, EnumStyle> = {
  open: {
    label: "Open",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    chart: "var(--color-status-open)",
  },
  in_progress: {
    label: "In Progress",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    chart: "var(--color-status-in_progress)",
  },
  waiting_on_customer: {
    label: "Waiting",
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/25",
    dot: "bg-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    chart: "var(--color-status-waiting_on_customer)",
  },
  resolved: {
    label: "Resolved",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    chart: "var(--color-status-resolved)",
  },
  closed: {
    label: "Closed",
    badge:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    chart: "var(--color-status-closed)",
  },
};

export const PRIORITY_STYLES: Record<TicketPriority, EnumStyle> = {
  critical: {
    label: "Critical",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    chart: "oklch(0.63 0.24 27)",
  },
  high: {
    label: "High",
    badge:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    chart: "oklch(0.7 0.19 45)",
  },
  medium: {
    label: "Medium",
    badge:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/25",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-500",
    chart: "oklch(0.8 0.16 85)",
  },
  low: {
    label: "Low",
    badge:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    chart: "oklch(0.7 0.03 260)",
  },
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Network",
  access: "Access",
  other: "Other",
};

export const CUSTOMER_STATUS_STYLES: Record<CustomerStatus, EnumStyle> = {
  active: {
    label: "Active",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    chart: "",
  },
  inactive: {
    label: "Inactive",
    badge:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    chart: "",
  },
};

export const STATUS_ORDER: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
];

export const PRIORITY_ORDER: TicketPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/** Deterministic avatar tint palette, keyed by the `accent` field. */
export const AVATAR_TINTS: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
};

export function ticketNumber(n: number): string {
  return `TCK-${n}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
