// ---------------------------------------------------------------------------
// Deterministic seed data. IMPORTANT: everything here is generated from a fixed
// NOW constant and a seeded PRNG so server and client renders are byte-identical
// (no hydration mismatch). Never introduce Date.now() / Math.random() here.
// ---------------------------------------------------------------------------

import type {
  Activity,
  Contact,
  Customer,
  Note,
  Tag,
  Technician,
  Ticket,
  TicketComment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "./types";
import { NOW } from "./clock";

export { NOW };

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function iso(msAgo: number): string {
  return new Date(NOW - msAgo).toISOString();
}

// Small seeded PRNG (mulberry32) — deterministic across server/client.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x5eed);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const chance = (p: number) => rng() < p;
const int = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

// -- Technicians -----------------------------------------------------------

export const technicians: Technician[] = [
  {
    id: "tech-1",
    name: "Sarah Chen",
    email: "sarah.chen@helpdesk.io",
    role: "admin",
    title: "IT Support Lead",
    specialties: ["Networking", "Security", "Escalations"],
    accent: "indigo",
  },
  {
    id: "tech-2",
    name: "Marcus Reid",
    email: "marcus.reid@helpdesk.io",
    role: "technician",
    title: "Systems Technician",
    specialties: ["Hardware", "Windows", "Printers"],
    accent: "sky",
  },
  {
    id: "tech-3",
    name: "Priya Nair",
    email: "priya.nair@helpdesk.io",
    role: "technician",
    title: "Support Engineer",
    specialties: ["Software", "SaaS", "Access"],
    accent: "emerald",
  },
  {
    id: "tech-4",
    name: "Diego Alvarez",
    email: "diego.alvarez@helpdesk.io",
    role: "technician",
    title: "Network Technician",
    specialties: ["Networking", "VPN", "Firewalls"],
    accent: "amber",
  },
  {
    id: "tech-5",
    name: "Hannah Wolfe",
    email: "hannah.wolfe@helpdesk.io",
    role: "technician",
    title: "Support Engineer",
    specialties: ["macOS", "Mobile", "Onboarding"],
    accent: "rose",
  },
];

// -- Customers -------------------------------------------------------------

const customerSeed: Array<
  Omit<Customer, "id" | "createdAt" | "slaTier"> & { daysAgo: number }
> = [
  { name: "Acme Corporation", industry: "Manufacturing", website: "acme.com", phone: "+1 (415) 555-0142", location: "San Francisco, CA", status: "active", accent: "indigo", daysAgo: 320 },
  { name: "Northwind Traders", industry: "Retail", website: "northwind.co", phone: "+1 (212) 555-0178", location: "New York, NY", status: "active", accent: "sky", daysAgo: 280 },
  { name: "Globex Systems", industry: "Technology", website: "globex.io", phone: "+1 (206) 555-0119", location: "Seattle, WA", status: "active", accent: "violet", daysAgo: 240 },
  { name: "Initech Solutions", industry: "Finance", website: "initech.com", phone: "+1 (312) 555-0155", location: "Chicago, IL", status: "active", accent: "emerald", daysAgo: 210 },
  { name: "Umbrella Health", industry: "Healthcare", website: "umbrellahealth.org", phone: "+1 (617) 555-0133", location: "Boston, MA", status: "active", accent: "rose", daysAgo: 190 },
  { name: "Stark Industries", industry: "Aerospace", website: "stark.com", phone: "+1 (310) 555-0188", location: "Los Angeles, CA", status: "active", accent: "amber", daysAgo: 165 },
  { name: "Wayne Enterprises", industry: "Conglomerate", website: "wayne.co", phone: "+1 (201) 555-0164", location: "Newark, NJ", status: "active", accent: "teal", daysAgo: 150 },
  { name: "Soylent Foods", industry: "Food & Bev", website: "soylent.co", phone: "+1 (503) 555-0111", location: "Portland, OR", status: "inactive", accent: "fuchsia", daysAgo: 130 },
  { name: "Hooli Cloud", industry: "Technology", website: "hooli.com", phone: "+1 (650) 555-0127", location: "Palo Alto, CA", status: "active", accent: "sky", daysAgo: 110 },
  { name: "Pied Piper", industry: "Technology", website: "piedpiper.com", phone: "+1 (408) 555-0193", location: "San Jose, CA", status: "active", accent: "indigo", daysAgo: 85 },
  { name: "Vandelay Imports", industry: "Logistics", website: "vandelay.com", phone: "+1 (305) 555-0146", location: "Miami, FL", status: "inactive", accent: "emerald", daysAgo: 60 },
  { name: "Cyberdyne Labs", industry: "Robotics", website: "cyberdyne.ai", phone: "+1 (512) 555-0170", location: "Austin, TX", status: "active", accent: "violet", daysAgo: 40 },
];

// Service tier per customer — a deterministic mix so the demo shows the spread
// (every 4th is enterprise, every 3rd business, the rest standard).
const slaTierFor = (i: number): Customer["slaTier"] =>
  i % 4 === 0 ? "enterprise" : i % 3 === 0 ? "business" : "standard";

export const customers: Customer[] = customerSeed.map((c, i) => {
  const { daysAgo, ...rest } = c;
  return {
    ...rest,
    id: `cust-${i + 1}`,
    slaTier: slaTierFor(i),
    createdAt: iso(daysAgo * DAY),
  };
});

// -- Contacts --------------------------------------------------------------

const firstNames = ["James", "Maria", "Wei", "Aisha", "Tom", "Elena", "Raj", "Nina", "Carlos", "Yuki", "Omar", "Grace", "Liam", "Sofia", "Noah", "Ava", "Ethan", "Zoe", "Lucas", "Mia"];
const lastNames = ["Bennett", "Okoro", "Zhang", "Patel", "Novak", "Rossi", "Kim", "Silva", "Haddad", "Brooks", "Ferrari", "Nguyen", "Kowalski", "Costa", "Ahmed", "Lindqvist", "Moreau", "Tanaka", "Ivanov", "Mendez"];
const roles = ["IT Manager", "Operations Lead", "Office Admin", "CTO", "Systems Admin", "Facilities Manager", "Finance Director", "HR Coordinator"];

export const contacts: Contact[] = [];
let contactCounter = 1;
for (const customer of customers) {
  const count = int(1, 3);
  for (let j = 0; j < count; j++) {
    const first = firstNames[(contactCounter * 7) % firstNames.length];
    const last = lastNames[(contactCounter * 3) % lastNames.length];
    contacts.push({
      id: `contact-${contactCounter}`,
      customerId: customer.id,
      firstName: first,
      lastName: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${customer.website}`,
      phone: `+1 (${int(200, 989)}) 555-0${int(100, 199)}`,
      role: j === 0 ? "IT Manager" : pick(roles),
      isPrimary: j === 0,
    });
    contactCounter++;
  }
}

function contactsForCustomer(customerId: string): Contact[] {
  return contacts.filter((c) => c.customerId === customerId);
}

// -- Tickets ---------------------------------------------------------------

const ticketTemplates: Array<{
  title: string;
  category: TicketCategory;
  description: string;
}> = [
  { title: "Laptop won't boot after update", category: "hardware", description: "User reports their Dell laptop shows a black screen after the latest Windows update. Power LED is on but no display output." },
  { title: "Cannot connect to corporate VPN", category: "network", description: "VPN client fails with error 809 when connecting from home. Was working yesterday. Affects remote work." },
  { title: "Outlook not syncing new emails", category: "software", description: "Emails stopped arriving in the desktop client around 9am. Webmail works fine. Send/receive returns a 0x800CCC0E error." },
  { title: "Request: new hire account provisioning", category: "access", description: "Please provision AD account, email, and Slack access for a new marketing hire starting Monday." },
  { title: "Printer on 3rd floor offline", category: "hardware", description: "Shared HP LaserJet in the copy room shows offline for all users. Power cycled the printer with no change." },
  { title: "Password reset locked out", category: "access", description: "User entered wrong password too many times and is now locked out of their account. Needs urgent unlock before a client call." },
  { title: "Wi-Fi dropping intermittently", category: "network", description: "Multiple users on the east wing report Wi-Fi disconnecting every few minutes. Started this morning." },
  { title: "Excel crashing on large files", category: "software", description: "Finance team's Excel crashes when opening the quarterly workbook (>50MB). Repro on two machines." },
  { title: "Monitor flickering", category: "hardware", description: "External monitor flickers when connected via USB-C dock. Direct HDMI works fine. Suspect dock firmware." },
  { title: "Shared drive permissions error", category: "access", description: "Team can no longer write to the \\\\fileserver\\projects share. Read works, write denied since the migration." },
  { title: "Slow network on video calls", category: "network", description: "Zoom calls freezing and audio cutting out for the sales team. Speed test shows 12ms/40Mbps, seems fine." },
  { title: "Software license expired", category: "software", description: "Adobe Creative Cloud shows license expired for the design team. Need renewal or seat reassignment." },
  { title: "New monitor request", category: "hardware", description: "User requests a second 27-inch monitor for their workstation to improve productivity." },
  { title: "MFA device lost", category: "access", description: "User lost their phone with the authenticator app and cannot log in. Needs MFA reset and re-enrollment." },
  { title: "Firewall blocking SaaS tool", category: "network", description: "New project management SaaS is blocked by the firewall. Please whitelist the required domains." },
  { title: "Blue screen on startup", category: "hardware", description: "Workstation BSODs with IRQL_NOT_LESS_OR_EQUAL on boot. Happens ~50% of the time." },
  { title: "Email marked as spam externally", category: "software", description: "Outbound emails to a key client are landing in spam. Suspect SPF/DKIM misconfiguration." },
  { title: "Onboarding: equipment setup", category: "other", description: "Set up laptop, monitor, and peripherals for a new engineering hire. Install standard software image." },
  { title: "Docking station not charging", category: "hardware", description: "USB-C dock no longer charges the laptop. Data works, power does not. Tried two cables." },
  { title: "Access to finance dashboard", category: "access", description: "Requesting read access to the finance BI dashboard for the new analyst." },
];

const statusWeights: Array<[TicketStatus, number]> = [
  ["open", 0.22],
  ["in_progress", 0.18],
  ["waiting_on_customer", 0.1],
  ["resolved", 0.32],
  ["closed", 0.18],
];
const priorityWeights: Array<[TicketPriority, number]> = [
  ["critical", 0.1],
  ["high", 0.25],
  ["medium", 0.4],
  ["low", 0.25],
];

function weighted<T>(weights: Array<[T, number]>): T {
  const r = rng();
  let acc = 0;
  for (const [val, w] of weights) {
    acc += w;
    if (r <= acc) return val;
  }
  return weights[weights.length - 1][0];
}

const TICKET_COUNT = 62;
export const tickets: Ticket[] = [];

for (let i = 0; i < TICKET_COUNT; i++) {
  const tpl = ticketTemplates[i % ticketTemplates.length];
  const customer = pick(customers);
  const custContacts = contactsForCustomer(customer.id);
  const contact = custContacts[0] ?? contacts[0];
  const status = weighted(statusWeights);
  const priority = weighted(priorityWeights);

  const createdMsAgo = int(0, 45) * DAY + int(0, 23) * HOUR + int(0, 59) * 60_000;
  const isResolved = status === "resolved" || status === "closed";
  // resolution latency scales inversely with priority
  const baseHours =
    priority === "critical" ? int(1, 8) :
    priority === "high" ? int(3, 24) :
    priority === "medium" ? int(6, 60) : int(12, 96);
  const resolveMs = baseHours * HOUR;
  const resolvedMsAgo = isResolved ? Math.max(createdMsAgo - resolveMs, HOUR) : null;
  const assignee =
    status === "open" && chance(0.4) ? null : pick(technicians).id;
  const updatedMsAgo = isResolved
    ? (resolvedMsAgo as number)
    : Math.max(createdMsAgo - int(0, 20) * HOUR, 0);

  tickets.push({
    id: `ticket-${i + 1}`,
    number: 1000 + i + 1,
    title: tpl.title,
    description: tpl.description,
    status,
    priority,
    category: tpl.category,
    customerId: customer.id,
    contactId: contact.id,
    assigneeId: assignee,
    createdAt: iso(createdMsAgo),
    updatedAt: iso(updatedMsAgo),
    resolvedAt: resolvedMsAgo != null ? iso(resolvedMsAgo) : null,
  });
}

// Newest first for stable list ordering
tickets.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

// -- Comments --------------------------------------------------------------

const commentBodies = [
  "Thanks for the report — taking a look now.",
  "Could you confirm the exact error message you're seeing?",
  "I've reproduced this on my end. Escalating to the network team.",
  "Applied a fix and pushed the config change. Please retry.",
  "Waiting on the vendor to confirm the license reassignment.",
  "Replaced the faulty cable, seems stable now. Monitoring.",
  "Reset the account and sent new credentials via secure link.",
  "This looks resolved on our side — closing unless it recurs.",
];

export const comments: TicketComment[] = [];
let commentCounter = 1;
for (const ticket of tickets) {
  if (chance(0.55)) {
    const n = int(1, 3);
    for (let k = 0; k < n; k++) {
      const author = ticket.assigneeId ?? pick(technicians).id;
      const createdMsAgo = Math.max(
        Date.parse(ticket.createdAt) - NOW + (k + 1) * HOUR * -1 * int(2, 10),
        -Date.parse(ticket.createdAt),
      );
      comments.push({
        id: `comment-${commentCounter++}`,
        ticketId: ticket.id,
        authorId: author,
        body: pick(commentBodies),
        createdAt: iso(
          Math.max(
            NOW - Date.parse(ticket.createdAt) - k * int(3, 12) * HOUR,
            HOUR,
          ),
        ),
      });
    }
  }
}

// -- Activities (recent feed) ----------------------------------------------

export const activities: Activity[] = [];
let activityCounter = 1;

// Derive recent activities from the newest tickets + customer signups.
const recentTickets = [...tickets]
  .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  .slice(0, 20);

for (const ticket of recentTickets) {
  const actor = ticket.assigneeId ?? pick(technicians).id;
  let type: Activity["type"] = "ticket_created";
  let meta: Record<string, string> | undefined;
  if (ticket.status === "resolved" || ticket.status === "closed") {
    type = "resolved";
  } else if (ticket.status === "in_progress") {
    type = "status_changed";
    meta = { from: "open", to: "in_progress" };
  } else if (ticket.assigneeId) {
    type = "assigned";
  }
  activities.push({
    id: `act-${activityCounter++}`,
    type,
    actorId: actor,
    ticketId: ticket.id,
    createdAt: ticket.updatedAt,
  });
}

// A few customer signups
for (const customer of [...customers].slice(-4)) {
  activities.push({
    id: `act-${activityCounter++}`,
    type: "customer_created",
    actorId: "tech-1",
    customerId: customer.id,
    createdAt: customer.createdAt,
  });
}

activities.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

// -- Notes (one per customer) ----------------------------------------------

const noteTemplates = [
  "Key account — prioritize their tickets and keep the primary contact looped in.",
  "Prefers email over phone for updates. Renewal discussion due next quarter.",
  "Migrated to the new VPN gateway last month; watch for related connectivity issues.",
  "Onboarding a new office location; expect a spike in hardware requests.",
  "Sensitive to downtime during business hours — schedule maintenance after 6pm.",
];

export const notes: Note[] = customers.map((customer, i) => ({
  id: `note-${i + 1}`,
  customerId: customer.id,
  authorId: "tech-1",
  body: noteTemplates[i % noteTemplates.length],
  createdAt: iso((10 + i) * DAY),
}));

// -- Tags ------------------------------------------------------------------
// A small workspace tag vocabulary, deterministically applied to seeded
// tickets from their category/priority/status so the labels look coherent.

export const tags: Tag[] = [
  { id: "tag-vip", name: "VIP", color: "rose", createdAt: iso(60 * DAY) },
  { id: "tag-regression", name: "Regression", color: "red", createdAt: iso(60 * DAY) },
  { id: "tag-needs-info", name: "Needs info", color: "amber", createdAt: iso(60 * DAY) },
  { id: "tag-rma", name: "Hardware RMA", color: "orange", createdAt: iso(60 * DAY) },
  { id: "tag-follow-up", name: "Follow-up", color: "sky", createdAt: iso(60 * DAY) },
  { id: "tag-quick-win", name: "Quick win", color: "emerald", createdAt: iso(60 * DAY) },
  { id: "tag-escalated", name: "Escalated", color: "violet", createdAt: iso(60 * DAY) },
];

export const ticketTags: { ticketId: string; tagId: string }[] = [];
tickets.forEach((t, i) => {
  const applied = new Set<string>();
  const add = (tagId: string) => applied.add(tagId);

  if (t.category === "hardware") add("tag-rma");
  if (t.priority === "critical" || t.priority === "high") add("tag-escalated");
  if (t.status === "waiting_on_customer") add("tag-needs-info");
  if (t.priority === "low") add("tag-quick-win");
  if (i % 6 === 0) add("tag-vip");
  if (i % 5 === 0) add("tag-follow-up");
  if (i % 7 === 0) add("tag-regression");

  for (const tagId of applied)
    ticketTags.push({ ticketId: t.id, tagId });
});

// -- Saved views (one demo view for the admin) -----------------------------

export const savedViews = [
  {
    id: "view-seed-1",
    ownerId: "tech-1",
    name: "Critical & overdue",
    params: "priority=critical&overdue=true",
    createdAt: iso(30 * DAY),
  },
  {
    id: "view-seed-2",
    ownerId: "tech-1",
    name: "Escalated queue",
    params: "tag=tag-escalated&sort=priority&dir=asc",
    createdAt: iso(20 * DAY),
  },
];

// -- Knowledge base (starter runbooks) -------------------------------------
// Seeded with fixed ids so they're inserted once and then persist — they are
// idempotently backfilled on startup (see seedKnowledgeNotes in db/index.ts),
// never wiped by a reseed, and skipped if edited or soft-deleted.

export const knowledgeNotes: {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}[] = [
  {
    id: "kn-seed-vpn",
    title: "VPN won't connect after password reset",
    body: "When a user resets their domain password, the cached VPN credential goes stale and the client fails with error 809/691. Fix: open the VPN client, forget the saved profile, and re-authenticate with the new password. If it still fails, confirm the account isn't locked in AD and that MFA was re-enrolled. Escalate to Networking if the gateway rejects a known-good credential.",
    authorId: "tech-1",
    createdAt: iso(40 * DAY),
    updatedAt: iso(6 * DAY),
  },
  {
    id: "kn-seed-printer",
    title: "Shared printer offline / stuck queue",
    body: "Symptoms: jobs pile up and the printer shows offline for everyone. Fix: on the print server, restart the Print Spooler service, clear C:\\\\Windows\\\\System32\\\\spool\\\\PRINTERS, then power-cycle the device. For the copy-room HP LaserJet, assign a static IP so DHCP renewals don't drop the port. Tag hardware faults with Hardware RMA.",
    authorId: "tech-2",
    createdAt: iso(33 * DAY),
    updatedAt: iso(33 * DAY),
  },
  {
    id: "kn-seed-onboarding",
    title: "New hire account provisioning checklist",
    body: "1) Create the AD account and add to the correct department group. 2) Assign an M365 license and mailbox. 3) Provision SSO apps (Slack, Jira, the CRM). 4) Enroll MFA. 5) Order hardware and image the laptop. 6) Grant VPN access. Aim to finish provisioning the business day before the start date so first-day tickets don't spike.",
    authorId: "tech-3",
    createdAt: iso(28 * DAY),
    updatedAt: iso(9 * DAY),
  },
  {
    id: "kn-seed-mfa",
    title: "Resetting MFA for a lost or replaced phone",
    body: "If a user loses their phone or gets a new device, their MFA enrollment must be reset before they can sign in. Verify identity out-of-band (manager confirmation or a known security question), then remove the old authenticator method in the admin console and have the user re-enroll from the sign-in prompt. Never read one-time codes to a user over chat or phone.",
    authorId: "tech-1",
    createdAt: iso(21 * DAY),
    updatedAt: iso(21 * DAY),
  },
  {
    id: "kn-seed-email-spam",
    title: "Legitimate email flagged as spam",
    body: "When a trusted sender lands in quarantine, check the message headers for SPF/DKIM/DMARC failures before allow-listing. If the sender's domain fails DMARC, the right fix is on their side — don't blanket-allow the domain. For one-off releases, release from quarantine and add the specific sender, not the whole domain, to the allow list.",
    authorId: "tech-4",
    createdAt: iso(14 * DAY),
    updatedAt: iso(5 * DAY),
  },
  {
    id: "kn-seed-slow-laptop",
    title: "Triage: 'my laptop is slow'",
    body: "Quick triage before reimaging: check disk free space (<10% tanks performance), review Task Manager for a runaway process, confirm pending Windows updates aren't installing, and run a malware scan. Roaming-profile users with huge desktops see slow logons — redirect folders to OneDrive. Only reimage as a last resort after backing up the user's data.",
    authorId: "tech-2",
    createdAt: iso(8 * DAY),
    updatedAt: iso(8 * DAY),
  },
];
