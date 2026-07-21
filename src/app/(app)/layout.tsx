import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { NewTicketOption } from "@/components/tickets/new-ticket-dialog";
import {
  getActivityFeed,
  getCustomers,
  getTechnicians,
} from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [customers, technicians, notifications] = await Promise.all([
    getCustomers(),
    getTechnicians(),
    getActivityFeed(8),
  ]);

  const customerOptions: NewTicketOption[] = customers.map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const technicianOptions: NewTicketOption[] = technicians.map((t) => ({
    id: t.id,
    label: t.name,
    sublabel: t.title,
  }));

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          id: user.id,
          name: user.name,
          title: user.title,
          accent: user.accent,
          role: user.role,
        }}
      />
      <SidebarInset className="min-w-0">
        <Topbar
          customers={customerOptions}
          technicians={technicianOptions}
          notifications={notifications}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
