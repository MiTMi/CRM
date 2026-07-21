import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EntityAvatar } from "@/components/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { SlaPolicyForm } from "@/components/settings/sla-policy-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSlaPolicy } from "@/lib/data/repository";
import { SLA_TIERS, SLA_TIER_ORDER } from "@/lib/data/sla";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, slaPolicy] = await Promise.all([getCurrentUser(), getSlaPolicy()]);
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your workspace and account preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your profile within the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <EntityAvatar
              name={user?.name ?? "User"}
              accent={user?.accent ?? "indigo"}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2 font-medium">
                {user?.name ?? "User"}
                <Badge variant="secondary" className="capitalize">
                  {user?.role ?? "technician"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" value={user?.title ?? "—"} />
            <Field label="Specialties" value={user?.specialties.join(", ") ?? "—"} />
            <Field label="Timezone" value="UTC" />
            <Field label="Plan" value="Demo workspace" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA targets</CardTitle>
          <CardDescription>
            Base resolution time per priority. Service tiers scale these —{" "}
            {SLA_TIER_ORDER.filter((t) => t !== "standard")
              .map((t) => `${SLA_TIERS[t].label} ${SLA_TIERS[t].blurb.toLowerCase()}`)
              .join(", ")}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlaPolicyForm policy={slaPolicy} canEdit={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Switch between light and dark mode using the toggle in the top bar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The interface adapts automatically to your system theme and
            remembers your choice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
