-- Complete Ticket System Enhancement Migration
-- Adds: custom fields, tags, members, checklists, sub-tasks, audit logs

-- Add new fields to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_field_1 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_field_2 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_field_3 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_field_4 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_field_5 TEXT;

-- Create ticket_members table
CREATE TABLE IF NOT EXISTS ticket_members (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  added_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_members_ticket_id ON ticket_members(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_members_user_id ON ticket_members(user_id);

-- Create ticket_checklists table
CREATE TABLE IF NOT EXISTS ticket_checklists (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_checklists_ticket_id ON ticket_checklists(ticket_id);

-- Create ticket_checklist_items table
CREATE TABLE IF NOT EXISTS ticket_checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES ticket_checklists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMP,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_checklist_items_checklist_id ON ticket_checklist_items(checklist_id);

-- Create ticket_sub_tasks table
CREATE TABLE IF NOT EXISTS ticket_sub_tasks (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_sub_tasks_ticket_id ON ticket_sub_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sub_tasks_assigned_to ON ticket_sub_tasks(assigned_to);

-- Create ticket_audit_logs table
CREATE TABLE IF NOT EXISTS ticket_audit_logs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_audit_logs_ticket_id ON ticket_audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_logs_user_id ON ticket_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_logs_created_at ON ticket_audit_logs(created_at);

-- Add index on due_date for expiration queries
CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON tickets(due_date);
