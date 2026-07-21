// ---------------------------------------------------------------------------
// Core domain types for the CRM. Phase 1 uses these against mock data; the
// eventual Prisma schema (Phase 3) mirrors these exactly. Pages must consume
// data only through `repository.ts`, never these raw shapes directly.
// ---------------------------------------------------------------------------

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "critical" | "high" | "medium" | "low";

export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "access"
  | "other";

export type CustomerStatus = "active" | "inactive";

/** Service level: scales a customer's ticket SLA targets (see SLA_TIERS). */
export type CustomerTier = "standard" | "business" | "enterprise";

export type TechnicianRole = "admin" | "technician";

export type ActivityType =
  | "ticket_created"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "comment_added"
  | "attachment_added"
  | "resolved"
  | "customer_created"
  | "customer_updated"
  | "contact_added"
  | "note_added"
  | "tagged"
  | "untagged";

export interface Customer {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  location: string;
  status: CustomerStatus;
  /** Service level that scales this customer's ticket SLA targets. */
  slaTier: CustomerTier;
  /** Deterministic avatar tint key */
  accent: string;
  createdAt: string; // ISO
}

export interface Contact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  role: TechnicianRole;
  title: string;
  specialties: string[];
  /** Deterministic avatar tint key */
  accent: string;
}

export interface Ticket {
  id: string;
  /** Auto-increment integer, rendered as TCK-1042 in the UI */
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  contactId: string;
  assigneeId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  resolvedAt: string | null; // ISO
}

export interface Tag {
  id: string;
  name: string;
  /** Key into TAG_COLORS (single source of truth for chip styling). */
  color: string;
  createdAt: string; // ISO
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string; // technician id
  body: string;
  createdAt: string; // ISO
}

export interface Note {
  id: string;
  customerId: string;
  authorId: string; // technician id
  body: string;
  createdAt: string; // ISO
}

export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  mime: string;
  size: number; // bytes
  uploaderId: string; // technician id
  createdAt: string; // ISO
}

// -- Knowledge base --------------------------------------------------------

export interface KnowledgeNote {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

/** Enriched note for list/detail rendering. */
export interface KnowledgeNoteWithMeta extends KnowledgeNote {
  authorName: string;
  authorAccent: string;
  attachmentCount: number;
}

export interface KnowledgeNoteVersion {
  id: string;
  noteId: string;
  title: string;
  body: string;
  action: "edited" | "deleted";
  editorId: string;
  editorName: string;
  createdAt: string;
}

export interface KnowledgeAttachment {
  id: string;
  noteId: string;
  filename: string;
  mime: string;
  size: number;
  uploaderId: string;
  createdAt: string;
}

/** An Activity enriched with the display fields the feed/notifications need. */
export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  actorName: string;
  createdAt: string;
  ticketId?: string;
  ticketNumber?: number;
  customerId?: string;
  customerName?: string;
  meta?: Record<string, string>;
}

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string; // technician id
  ticketId?: string;
  customerId?: string;
  /** e.g. { from: "open", to: "in_progress" } */
  meta?: Record<string, string>;
  createdAt: string; // ISO
}

// -- Derived / view models -------------------------------------------------

export interface DashboardStats {
  openTickets: number;
  openTicketsDelta: number; // % vs previous 7d window
  avgResolutionHours: number;
  avgResolutionDelta: number;
  resolved7d: number;
  resolved7dDelta: number;
  activeCustomers: number;
  activeCustomersDelta: number;
  /** Tiny sparkline series (last 7 buckets) for each KPI card */
  spark: {
    open: number[];
    resolution: number[];
    resolved: number[];
    customers: number[];
  };
}

export interface VolumePoint {
  date: string; // ISO day
  label: string; // e.g. "Jun 3"
  created: number;
  resolved: number;
}

export interface StatusSlice {
  status: TicketStatus;
  count: number;
}

export interface TechnicianWorkload {
  technician: Technician;
  open: number;
  inProgress: number;
  resolved7d: number;
  /** 0..1 relative to the busiest technician */
  load: number;
}

/** A ticket joined with its customer / contact / assignee for list + detail views. */
export interface TicketWithRelations extends Ticket {
  customer: Customer;
  contact: Contact;
  assignee: Technician | null;
  tags: Tag[];
}

/** A saved bundle of ticket-list filter/sort params, owned by a technician. */
export interface SavedView {
  id: string;
  ownerId: string;
  name: string;
  /** URL query string, e.g. "status=open&priority=high&mine=true". */
  params: string;
  createdAt: string; // ISO
}

export interface CustomerWithStats extends Customer {
  contactCount: number;
  openTickets: number;
  totalTickets: number;
  primaryContact: Contact | null;
}

// -- Server-side query / pagination ----------------------------------------

export type TicketSort = "created" | "priority" | "title";
export type SortDir = "asc" | "desc";

export interface TicketQuery {
  query?: string;
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  assigneeId?: string | "all" | "unassigned";
  /** When set (to a technician id), restricts to that assignee and overrides assigneeId. */
  mine?: string;
  /** Restrict to tickets carrying this tag id. */
  tagId?: string | "all";
  /** Restrict to open tickets past their SLA due date. */
  overdue?: boolean;
  sort?: TicketSort;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}

export type StatusCounts = Record<TicketStatus | "all", number>;

export interface TicketPage {
  rows: TicketWithRelations[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  statusCounts: StatusCounts;
}

export interface CustomerQuery {
  query?: string;
  status?: CustomerStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface CustomerPage {
  rows: CustomerWithStats[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface WorkspaceSearchResults {
  tickets: { id: string; number: number; title: string; customer: string }[];
  customers: { id: string; name: string; industry: string }[];
  technicians: { id: string; name: string; title: string }[];
  knowledge: { id: string; title: string; snippet: string }[];
}
