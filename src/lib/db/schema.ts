// SQL DDL for the CRM. Dates are stored as ISO text; booleans as 0/1;
// list/object fields (specialties, activity meta) as JSON text.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  industry    TEXT NOT NULL,
  website     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  location    TEXT NOT NULL,
  status      TEXT NOT NULL,
  accent      TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  role        TEXT NOT NULL,
  is_primary  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS technicians (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  title         TEXT NOT NULL,
  specialties   TEXT NOT NULL,
  accent        TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tickets (
  id          TEXT PRIMARY KEY,
  number      INTEGER NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL,
  priority    TEXT NOT NULL,
  category    TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  contact_id  TEXT NOT NULL REFERENCES contacts(id),
  assignee_id TEXT REFERENCES technicians(id),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  author_id  TEXT NOT NULL REFERENCES technicians(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  author_id   TEXT NOT NULL REFERENCES technicians(id),
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id          TEXT PRIMARY KEY,
  ticket_id   TEXT NOT NULL REFERENCES tickets(id),
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  path        TEXT NOT NULL,
  uploader_id TEXT NOT NULL REFERENCES technicians(id),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  ticket_id   TEXT,
  customer_id TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_id);
CREATE TABLE IF NOT EXISTS knowledge_notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  author_id   TEXT NOT NULL REFERENCES technicians(id),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  deleted_by  TEXT
);

-- Snapshot of a note's prior state, taken on every edit and on delete, so an
-- admin can audit what changed after a technician edits or removes a note.
CREATE TABLE IF NOT EXISTS knowledge_note_versions (
  id         TEXT PRIMARY KEY,
  note_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  action     TEXT NOT NULL,
  editor_id  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_attachments (
  id          TEXT PRIMARY KEY,
  note_id     TEXT NOT NULL REFERENCES knowledge_notes(id),
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  path        TEXT NOT NULL,
  uploader_id TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kn_versions_note ON knowledge_note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_kn_attachments_note ON knowledge_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
`;
