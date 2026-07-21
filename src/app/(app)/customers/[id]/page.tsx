import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Phone,
  Star,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityAvatar } from "@/components/entity-avatar";
import { CustomerStatusBadge } from "@/components/tags";
import { TicketQueueItem } from "@/components/tickets/ticket-queue-item";
import { EmptyState } from "@/components/empty-state";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { ContactDialog } from "@/components/customers/contact-dialog";
import { ContactRowActions } from "@/components/customers/contact-row-actions";
import { NotesSection } from "@/components/customers/notes-section";
import {
  getContactsForCustomer,
  getCustomerById,
  getNotesForCustomer,
  getTechnicians,
  getTicketsForCustomer,
} from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerById(id);
  return { title: customer?.name ?? "Customer" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const [contacts, tickets, notes, technicians, currentUser] = await Promise.all([
    getContactsForCustomer(customer.id),
    getTicketsForCustomer(customer.id),
    getNotesForCustomer(customer.id),
    getTechnicians(),
    getCurrentUser(),
  ]);
  const techById = new Map(technicians.map((t) => [t.id, t]));
  const openTickets = tickets.filter((t) =>
    ["open", "in_progress", "waiting_on_customer"].includes(t.status),
  );
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/customers">
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
      </Button>

      {/* Header card */}
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <EntityAvatar
              name={customer.name}
              accent={customer.accent}
              size="lg"
              square
              className="size-14 text-lg"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {customer.name}
                </h1>
                <CustomerStatusBadge status={customer.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="font-medium">
                    {customer.industry}
                  </Badge>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {customer.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  {customer.website}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {customer.phone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:gap-8">
            <Stat label="Contacts" value={customer.contactCount} />
            <Stat label="Open" value={customer.openTickets} />
            <Stat label="Total" value={customer.totalTickets} />
            {isAdmin && (
              <CustomerDialog
                mode="edit"
                customer={{
                  id: customer.id,
                  name: customer.name,
                  industry: customer.industry,
                  website: customer.website,
                  phone: customer.phone,
                  location: customer.location,
                  status: customer.status,
                }}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            <span className="ml-1.5 text-xs text-muted-foreground">
              {contacts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets
            <span className="ml-1.5 text-xs text-muted-foreground">
              {tickets.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Primary Contact</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.primaryContact ? (
                  <div className="flex items-center gap-3">
                    <EntityAvatar
                      name={`${customer.primaryContact.firstName} ${customer.primaryContact.lastName}`}
                      accent={customer.accent}
                    />
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {customer.primaryContact.firstName}{" "}
                        {customer.primaryContact.lastName}
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.primaryContact.role} ·{" "}
                        {customer.primaryContact.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No primary contact set.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Open Tickets</CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {openTickets.length > 0 ? (
                  <div className="divide-y">
                    {openTickets.slice(0, 4).map((t) => (
                      <TicketQueueItem key={t.id} ticket={t} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={TicketIcon}
                    title="No open tickets"
                    description="This customer has no active support requests."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-4">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="flex items-center gap-2 font-medium">
                <Users className="size-4" />
                Contacts
              </h3>
              <ContactDialog mode="create" customerId={customer.id} />
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EntityAvatar
                          name={`${c.firstName} ${c.lastName}`}
                          accent={customer.accent}
                          size="sm"
                        />
                        <span className="font-medium">
                          {c.firstName} {c.lastName}
                        </span>
                        {c.isPrimary && (
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.role}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone}
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactRowActions
                        customerId={customer.id}
                        contact={{
                          id: c.id,
                          firstName: c.firstName,
                          lastName: c.lastName,
                          email: c.email,
                          phone: c.phone,
                          role: c.role,
                          isPrimary: c.isPrimary,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets" className="mt-4">
          <Card className="px-3 py-3">
            {tickets.length > 0 ? (
              <div className="divide-y">
                {tickets.map((t) => (
                  <TicketQueueItem key={t.id} ticket={t} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={TicketIcon}
                title="No tickets yet"
                description="This customer hasn't submitted any tickets."
              />
            )}
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent>
              <NotesSection
                customerId={customer.id}
                notes={notes.map((note) => {
                  const author = techById.get(note.authorId);
                  return {
                    id: note.id,
                    authorName: author?.name ?? "Agent",
                    authorAccent: author?.accent ?? "indigo",
                    body: note.body,
                    createdAt: note.createdAt,
                  };
                })}
                currentUser={{
                  name: currentUser?.name ?? "You",
                  accent: currentUser?.accent ?? "indigo",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="tnum text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
