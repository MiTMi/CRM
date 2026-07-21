import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  CUSTOMER_STATUS_STYLES,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from "@/lib/data/constants";
import type {
  CustomerStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

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
