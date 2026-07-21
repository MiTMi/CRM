// ---------------------------------------------------------------------------
// SLA policy. A ticket's resolution due date is derived from its creation time
// and current priority — no stored column needed. Everything is computed
// against the fixed demo clock (NOW) so it's stable and hydration-safe.
// ---------------------------------------------------------------------------

import { NOW } from "./clock";
import type { CustomerTier, TicketPriority, TicketStatus } from "./types";

const HOUR = 3600_000;

/** Base target resolution time (hours) per priority — for a standard customer. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 120,
};

/**
 * Service tiers scale the base SLA targets: a lower multiplier means a tighter
 * deadline. `multiplier` is the single source of truth — the SQL due-date math
 * in repository.ts is generated from these values, so change them here only.
 */
export const SLA_TIERS: Record<
  CustomerTier,
  { label: string; multiplier: number; blurb: string; badge: string; dot: string }
> = {
  standard: {
    label: "Standard",
    multiplier: 1,
    blurb: "Base response targets",
    badge:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    dot: "bg-zinc-400",
  },
  business: {
    label: "Business",
    multiplier: 0.75,
    blurb: "25% faster targets",
    badge:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25",
    dot: "bg-sky-500",
  },
  enterprise: {
    label: "Enterprise",
    multiplier: 0.5,
    blurb: "2× faster targets",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
    dot: "bg-amber-500",
  },
};

export const SLA_TIER_ORDER: CustomerTier[] = ["standard", "business", "enterprise"];

/** Base target hours per priority. Defaults to SLA_HOURS but can be overridden
 *  with the admin-edited policy loaded from the database. */
export type SlaPolicy = Record<TicketPriority, number>;

/** Effective SLA target (hours) for a priority at a given service tier. */
export function slaTargetHours(
  priority: TicketPriority,
  tier: CustomerTier = "standard",
  base: SlaPolicy = SLA_HOURS,
): number {
  return (base[priority] ?? SLA_HOURS[priority]) * (SLA_TIERS[tier]?.multiplier ?? 1);
}

const OPEN_STATES = new Set<TicketStatus>([
  "open",
  "in_progress",
  "waiting_on_customer",
]);

export type SlaState =
  | "on_track"
  | "due_soon"
  | "overdue"
  | "met"
  | "breached";

export interface Sla {
  /** ISO due date (createdAt + SLA target). */
  dueAt: string;
  state: SlaState;
  /** Open ticket past its due date. */
  overdue: boolean;
  /** due − now (ms). Negative once past due. For resolved tickets, due − resolvedAt. */
  remainingMs: number;
}

export function computeSla(
  createdAt: string,
  priority: TicketPriority,
  status: TicketStatus,
  resolvedAt: string | null,
  tier: CustomerTier = "standard",
  base: SlaPolicy = SLA_HOURS,
  now: number = NOW,
): Sla {
  const targetHours = slaTargetHours(priority, tier, base);
  const due = Date.parse(createdAt) + targetHours * HOUR;
  const dueAt = new Date(due).toISOString();

  if (!OPEN_STATES.has(status)) {
    const resolved = resolvedAt ? Date.parse(resolvedAt) : now;
    return {
      dueAt,
      state: resolved <= due ? "met" : "breached",
      overdue: false,
      remainingMs: due - resolved,
    };
  }

  const remainingMs = due - now;
  const window = targetHours * HOUR;
  let state: SlaState;
  if (remainingMs < 0) state = "overdue";
  else if (remainingMs < window * 0.25) state = "due_soon";
  else state = "on_track";

  return { dueAt, state, overdue: remainingMs < 0, remainingMs };
}

export const SLA_STYLES: Record<
  SlaState,
  { label: string; badge: string; dot: string }
> = {
  on_track: {
    label: "On track",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  due_soon: {
    label: "Due soon",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
    dot: "bg-amber-500",
  },
  overdue: {
    label: "Overdue",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    dot: "bg-red-500",
  },
  met: {
    label: "SLA met",
    badge:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    dot: "bg-emerald-500",
  },
  breached: {
    label: "SLA breached",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    dot: "bg-red-500",
  },
};

/** "3h left", "2d left", "5h overdue", "just now". */
export function formatSlaRemaining(sla: Sla): string {
  const abs = Math.abs(sla.remainingMs);
  const hours = abs / HOUR;
  let magnitude: string;
  if (hours < 1) magnitude = `${Math.max(1, Math.round(abs / 60000))}m`;
  else if (hours < 48) magnitude = `${Math.round(hours)}h`;
  else magnitude = `${Math.round(hours / 24)}d`;

  if (sla.state === "overdue" || sla.state === "breached")
    return `${magnitude} overdue`;
  if (sla.state === "met") return "resolved in time";
  return `${magnitude} left`;
}
