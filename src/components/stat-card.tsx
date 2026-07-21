import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  spark,
  icon: Icon,
  /** For metrics where a decrease is good (e.g. resolution time). */
  invertDelta = false,
  sparkStroke = "stroke-primary",
  sparkFill = "fill-primary/10",
}: {
  label: string;
  value: string;
  delta: number;
  spark: number[];
  icon: LucideIcon;
  invertDelta?: boolean;
  sparkStroke?: string;
  sparkFill?: string;
}) {
  const isGood = invertDelta ? delta <= 0 : delta >= 0;
  const isFlat = delta === 0;
  const DeltaIcon = delta >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="relative gap-0 overflow-hidden p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="tnum text-3xl font-semibold tracking-tight">
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                isFlat
                  ? "bg-muted text-muted-foreground"
                  : isGood
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
              )}
            >
              {!isFlat && <DeltaIcon className="size-3" />}
              {formatDelta(delta)}
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        </div>
        <Sparkline
          data={spark}
          strokeClass={sparkStroke}
          fillClass={sparkFill}
          className="mb-0.5 shrink-0"
        />
      </div>
    </Card>
  );
}
