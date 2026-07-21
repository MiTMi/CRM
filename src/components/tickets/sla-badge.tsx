import { Badge } from "@/components/ui/badge";
import { SLA_STYLES, formatSlaRemaining, type Sla } from "@/lib/data/sla";
import { cn } from "@/lib/utils";

export function SlaBadge({
  sla,
  showTime = false,
  className,
}: {
  sla: Sla;
  showTime?: boolean;
  className?: string;
}) {
  const s = SLA_STYLES[sla.state];
  return (
    <Badge className={cn("gap-1.5 border font-medium", s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
      {showTime && (
        <span className="font-normal opacity-80">
          · {formatSlaRemaining(sla)}
        </span>
      )}
    </Badge>
  );
}
