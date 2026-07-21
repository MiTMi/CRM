import type { Metadata } from "next";
import { CheckCircle2, Mail, Shield } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddTechnicianDialog } from "@/components/technicians/add-technician-dialog";
import { EntityAvatar } from "@/components/entity-avatar";
import { getTechnicianWorkload } from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Technicians" };
export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  const [workload, currentUser] = await Promise.all([
    getTechnicianWorkload(),
    getCurrentUser(),
  ]);
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technicians"
        description="Your IT support team and their current workload."
        actions={isAdmin ? <AddTechnicianDialog /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workload.map((row) => {
          const t = row.technician;
          return (
            <Card key={t.id} className="gap-0 p-5">
              <div className="flex items-start gap-3">
                <EntityAvatar name={t.name} accent={t.accent} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-semibold">{t.name}</h3>
                    {t.role === "admin" && (
                      <Shield className="size-3.5 shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                  <a
                    href={`mailto:${t.email}`}
                    className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="size-3" />
                    <span className="truncate">{t.email}</span>
                  </a>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="font-medium">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="mt-5 space-y-2 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Open tickets</span>
                  <span className="tnum font-medium">{row.open}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.load > 0.75
                        ? "bg-red-500"
                        : row.load > 0.45
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${Math.max(row.load * 100, 4)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Resolved (7d)
                  </span>
                  <span className="tnum font-medium">{row.resolved7d}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
