import { EntityAvatar } from "@/components/entity-avatar";
import type { TechnicianWorkload } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function WorkloadList({ rows }: { rows: TechnicianWorkload[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.technician.id} className="flex items-center gap-3">
          <EntityAvatar
            name={row.technician.name}
            accent={row.technician.accent}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {row.technician.name}
              </span>
              <span className="tnum shrink-0 text-xs text-muted-foreground">
                {row.open} open
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  row.load > 0.75
                    ? "bg-red-500"
                    : row.load > 0.45
                      ? "bg-amber-500"
                      : "bg-primary",
                )}
                style={{ width: `${Math.max(row.load * 100, 4)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
