import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  AlarmClock,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Gauge,
  Mail,
  Tag,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/entity-avatar";
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
  SlaTierBadge,
} from "@/components/tags";
import { TicketControls } from "@/components/tickets/ticket-controls";
import { TicketTagsEditor } from "@/components/tickets/ticket-tags-editor";
import { CommentThread } from "@/components/tickets/comment-thread";
import { AttachmentsSection } from "@/components/tickets/attachments-section";
import { SlaBadge } from "@/components/tickets/sla-badge";
import { computeSla, SLA_TIERS } from "@/lib/data/sla";
import {
  getAllTags,
  getAttachmentsForTicket,
  getCommentsForTicket,
  getSlaPolicy,
  getTechnicians,
  getTicketById,
} from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import { ticketNumber } from "@/lib/data/constants";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getTicketById(id);
  return { title: ticket ? `${ticketNumber(ticket.number)} · ${ticket.title}` : "Ticket" };
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const [comments, attachments, technicians, currentUser, allTags, slaPolicy] =
    await Promise.all([
      getCommentsForTicket(ticket.id),
      getAttachmentsForTicket(ticket.id),
      getTechnicians(),
      getCurrentUser(),
      getAllTags(),
      getSlaPolicy(),
    ]);
  const techById = new Map(technicians.map((t) => [t.id, t]));
  const sla = computeSla(
    ticket.createdAt,
    ticket.priority,
    ticket.status,
    ticket.resolvedAt,
    ticket.customer.slaTier,
    slaPolicy,
  );

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
          <Link href="/tickets">
            <ArrowLeft className="size-4" />
            Back to tickets
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">
            {ticketNumber(ticket.number)}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {ticket.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: description + activity */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {ticket.description || (
                  <span className="italic">No description provided.</span>
                )}
              </p>
            </CardContent>
          </Card>

          <CommentThread
            ticketId={ticket.id}
            comments={comments.map((c) => {
              const author = techById.get(c.authorId);
              return {
                id: c.id,
                authorName: author?.name ?? "Agent",
                authorAccent: author?.accent ?? "indigo",
                body: c.body,
                createdAt: c.createdAt,
              };
            })}
            currentUser={{
              name: currentUser?.name ?? "You",
              accent: currentUser?.accent ?? "indigo",
            }}
          />

          <AttachmentsSection
            ticketId={ticket.id}
            attachments={attachments.map((a) => {
              const uploader = techById.get(a.uploaderId);
              return {
                id: a.id,
                filename: a.filename,
                mime: a.mime,
                size: a.size,
                uploaderName: uploader?.name ?? "Agent",
                uploaderAccent: uploader?.accent ?? "indigo",
                createdAt: a.createdAt,
              };
            })}
          />
        </div>

        {/* Right: controls + meta */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketControls
                ticketId={ticket.id}
                ticketNumber={ticketNumber(ticket.number)}
                status={ticket.status}
                priority={ticket.priority}
                assigneeId={ticket.assigneeId}
                technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketTagsEditor
                ticketId={ticket.id}
                tags={ticket.tags}
                allTags={allTags}
                canManage={currentUser?.role === "admin"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <MetaRow icon={Building2} label="Customer">
                <Link
                  href={`/customers/${ticket.customerId}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  <EntityAvatar
                    name={ticket.customer.name}
                    accent={ticket.customer.accent}
                    size="sm"
                    square
                  />
                  {ticket.customer.name}
                </Link>
              </MetaRow>

              <MetaRow icon={User} label="Contact">
                <div>
                  <div className="font-medium">
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ticket.contact.role}
                  </div>
                </div>
              </MetaRow>

              <MetaRow icon={Mail} label="Email">
                <a
                  href={`mailto:${ticket.contact.email}`}
                  className="truncate hover:underline"
                >
                  {ticket.contact.email}
                </a>
              </MetaRow>

              <MetaRow icon={Tag} label="Category">
                <CategoryBadge category={ticket.category} />
              </MetaRow>

              <Separator />

              <MetaRow icon={AlarmClock} label="SLA">
                <div className="flex flex-col items-end gap-1">
                  <SlaBadge sla={sla} />
                  <span className="text-xs text-muted-foreground">
                    {sla.state === "met" || sla.state === "breached"
                      ? "Target"
                      : "Due"}{" "}
                    {formatDateTime(sla.dueAt)}
                  </span>
                </div>
              </MetaRow>

              <MetaRow icon={Gauge} label="Service tier">
                <div className="flex flex-col items-end gap-1">
                  <SlaTierBadge tier={ticket.customer.slaTier} />
                  <span className="text-xs text-muted-foreground">
                    {SLA_TIERS[ticket.customer.slaTier].blurb}
                  </span>
                </div>
              </MetaRow>

              <MetaRow icon={Calendar} label="Created">
                <span className="text-muted-foreground">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </MetaRow>

              {ticket.resolvedAt && (
                <MetaRow icon={CheckCircle2} label="Resolved">
                  <span className="text-muted-foreground">
                    {formatDateTime(ticket.resolvedAt)}
                  </span>
                </MetaRow>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <div className="max-w-[60%] text-right">{children}</div>
    </div>
  );
}
