import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  CUSTOMER_STATUS_STYLES,
  PRIORITY_STYLES,
  STATUS_STYLES,
  tagColor,
} from "@/lib/data/constants";
import { SLA_TIERS } from "@/lib/data/sla";
import type {
  CustomerStatus,
  CustomerTier,
  Tag,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function SlaTierBadge({
  tier,
  className,
}: {
  tier: CustomerTier;
  className?: string;
}) {
  const t = SLA_TIERS[tier];
  return (
    <Badge className={cn("gap-1.5 border font-medium", t.badge, className)}>
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {t.label}
    </Badge>
  );
}

export function TagChip({
  tag,
  className,
  withDot = true,
}: {
  tag: Pick<Tag, "name" | "color">;
  className?: string;
  withDot?: boolean;
}) {
  const c = tagColor(tag.color);
  return (
    <Badge className={cn("gap-1.5 border font-medium", c.badge, className)}>
      {withDot && <span className={cn("size-1.5 rounded-full", c.dot)} />}
      {tag.name}
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const s = STATUS_STYLES[status];
  return (
    <Badge
      className={cn("gap-1.5 border font-medium", s.badge, className)}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

export function PriorityTag({
  priority,
  className,
  withDot = true,
}: {
  priority: TicketPriority;
  className?: string;
  withDot?: boolean;
}) {
  const p = PRIORITY_STYLES[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        p.text,
        className,
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", p.dot)} />}
      {p.label}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const p = PRIORITY_STYLES[priority];
  return (
    <Badge className={cn("gap-1.5 border font-medium", p.badge, className)}>
      <span className={cn("size-1.5 rounded-full", p.dot)} />
      {p.label}
    </Badge>
  );
}

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: CustomerStatus;
  className?: string;
}) {
  const s = CUSTOMER_STATUS_STYLES[status];
  return (
    <Badge className={cn("gap-1.5 border font-medium", s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

export function CategoryBadge({
  category,
  className,
}: {
  category: TicketCategory;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
