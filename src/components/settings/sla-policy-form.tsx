"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_ORDER, PRIORITY_STYLES } from "@/lib/data/constants";
import { updateSlaPolicy } from "@/lib/actions/settings";
import type { SlaPolicy } from "@/lib/data/sla";
import type { TicketPriority } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Unit = "hours" | "days";

interface Row {
  value: string;
  unit: Unit;
}

/** Pick the friendliest unit to display a whole-hour target in. */
function toRow(hours: number): Row {
  if (hours % 24 === 0 && hours >= 24) return { value: String(hours / 24), unit: "days" };
  return { value: String(hours), unit: "hours" };
}

function toHours(row: Row): number {
  const n = Number(row.value);
  if (!Number.isFinite(n)) return NaN;
  return row.unit === "days" ? n * 24 : n;
}

export function SlaPolicyForm({
  policy,
  canEdit,
}: {
  policy: SlaPolicy;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const initial = React.useMemo(() => {
    const r = {} as Record<TicketPriority, Row>;
    for (const p of PRIORITY_ORDER) r[p] = toRow(policy[p]);
    return r;
  }, [policy]);

  const [rows, setRows] = React.useState<Record<TicketPriority, Row>>(initial);
  React.useEffect(() => setRows(initial), [initial]);

  const dirty = PRIORITY_ORDER.some(
    (p) => toHours(rows[p]) !== policy[p] || Number.isNaN(toHours(rows[p])),
  );

  function setRow(p: TicketPriority, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }));
  }

  function handleSave() {
    const hours: Record<string, number> = {};
    for (const p of PRIORITY_ORDER) {
      const h = toHours(rows[p]);
      if (!Number.isFinite(h) || h < 1) {
        toast.error(`Enter a valid target for ${PRIORITY_STYLES[p].label}`);
        return;
      }
      hours[p] = Math.round(h);
    }
    startTransition(async () => {
      const res = await updateSlaPolicy(hours);
      if (res.ok) {
        toast.success("SLA targets updated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn't update SLA targets");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {PRIORITY_ORDER.map((p) => {
          const style = PRIORITY_STYLES[p];
          const hrs = toHours(rows[p]);
          return (
            <div key={p} className="flex items-center gap-3">
              <div className="flex w-28 items-center gap-2">
                <span className={cn("size-2 rounded-full", style.dot)} />
                <span className="text-sm font-medium">{style.label}</span>
              </div>
              <Input
                type="number"
                min={1}
                step={rows[p].unit === "days" ? 0.5 : 1}
                value={rows[p].value}
                disabled={!canEdit || pending}
                onChange={(e) => setRow(p, { value: e.target.value })}
                className="w-24"
                aria-label={`${style.label} target`}
              />
              <Select
                value={rows[p].unit}
                disabled={!canEdit || pending}
                onValueChange={(v) => setRow(p, { unit: v as Unit })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {Number.isFinite(hrs) && hrs > 0
                  ? `= ${Math.round(hrs)}h target to resolve`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={pending || !dirty}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save SLA targets
          </Button>
          {dirty && !pending && (
            <Button variant="ghost" onClick={() => setRows(initial)}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only admins can change SLA targets.
        </p>
      )}
    </div>
  );
}
