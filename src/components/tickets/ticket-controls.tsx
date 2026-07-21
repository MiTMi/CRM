"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  PRIORITY_ORDER,
  PRIORITY_STYLES,
  STATUS_ORDER,
  STATUS_STYLES,
} from "@/lib/data/constants";
import {
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "@/lib/actions/tickets";
import type { TicketPriority, TicketStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function TicketControls({
  ticketId,
  ticketNumber,
  status,
  priority,
  assigneeId,
  technicians,
}: {
  ticketId: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  technicians: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [curStatus, setStatus] = React.useState<TicketStatus>(status);
  const [curPriority, setPriority] = React.useState<TicketPriority>(priority);
  const [curAssignee, setAssignee] = React.useState<string>(
    assigneeId ?? "unassigned",
  );

  // Keep in sync if server data changes under us (after refresh).
  React.useEffect(() => setStatus(status), [status]);
  React.useEffect(() => setPriority(priority), [priority]);
  React.useEffect(() => setAssignee(assigneeId ?? "unassigned"), [assigneeId]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, revert: () => void, success: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else {
        revert();
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select
          value={curStatus}
          disabled={pending}
          onValueChange={(v) => {
            const prev = curStatus;
            setStatus(v as TicketStatus);
            run(
              () => updateTicketStatus(ticketId, v as TicketStatus),
              () => setStatus(prev),
              `${ticketNumber} → ${STATUS_STYLES[v as TicketStatus].label}`,
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                <span className={cn("size-1.5 rounded-full", STATUS_STYLES[s].dot)} />
                {STATUS_STYLES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Priority</label>
        <Select
          value={curPriority}
          disabled={pending}
          onValueChange={(v) => {
            const prev = curPriority;
            setPriority(v as TicketPriority);
            run(
              () => updateTicketPriority(ticketId, v as TicketPriority),
              () => setPriority(prev),
              `${ticketNumber} → ${PRIORITY_STYLES[v as TicketPriority].label}`,
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                <span className={cn("size-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />
                {PRIORITY_STYLES[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Assignee</label>
        <Select
          value={curAssignee}
          disabled={pending}
          onValueChange={(v) => {
            const prev = curAssignee;
            setAssignee(v);
            const name =
              v === "unassigned"
                ? "Unassigned"
                : technicians.find((t) => t.id === v)?.name;
            run(
              () => assignTicket(ticketId, v === "unassigned" ? null : v),
              () => setAssignee(prev),
              `${ticketNumber} → ${name}`,
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          disabled={pending || curStatus === "resolved" || curStatus === "closed"}
          onClick={() => {
            const prev = curStatus;
            setStatus("resolved");
            run(
              () => updateTicketStatus(ticketId, "resolved"),
              () => setStatus(prev),
              `${ticketNumber} resolved`,
            );
          }}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Mark Resolved
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={pending || curStatus === "closed"}
          onClick={() => {
            const prev = curStatus;
            setStatus("closed");
            run(
              () => updateTicketStatus(ticketId, "closed"),
              () => setStatus(prev),
              `${ticketNumber} closed`,
            );
          }}
        >
          <XCircle className="size-4" />
          Close Ticket
        </Button>
      </div>
    </div>
  );
}
