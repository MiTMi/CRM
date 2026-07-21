import Link from "next/link";
import { Users, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EntityAvatar } from "@/components/entity-avatar";
import { CustomerStatusBadge } from "@/components/tags";
import type { CustomerWithStats } from "@/lib/data/types";

export function CustomerCard({ customer }: { customer: CustomerWithStats }) {
  return (
    <Link href={`/customers/${customer.id}`} className="group block">
      <Card className="h-full gap-0 p-5 transition-all hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <EntityAvatar
              name={customer.name}
              accent={customer.accent}
              size="lg"
              square
            />
            <div>
              <h3 className="font-semibold leading-tight group-hover:text-primary">
                {customer.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {customer.industry}
              </p>
            </div>
          </div>
          <CustomerStatusBadge status={customer.status} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {customer.location}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-4" />
            <span className="tnum font-medium text-foreground">
              {customer.contactCount}
            </span>
            contacts
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Ticket className="size-4" />
            <span className="tnum font-medium text-foreground">
              {customer.openTickets}
            </span>
            open
          </span>
        </div>
      </Card>
    </Link>
  );
}
