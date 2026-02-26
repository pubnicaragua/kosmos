-- Fix production schema: Add all missing tables
-- Run this FIRST before add-ticket-comments.sql

-- Create pipeline_columns table if it doesn't exist
CREATE TABLE IF NOT EXISTS "pipeline_columns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_columns_pkey" PRIMARY KEY ("id")
);

-- Create indexes for pipeline_columns
CREATE INDEX IF NOT EXISTS "pipeline_columns_company_id_idx" ON "pipeline_columns"("company_id");
CREATE INDEX IF NOT EXISTS "pipeline_columns_user_id_idx" ON "pipeline_columns"("user_id");

-- Create unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pipeline_columns_company_id_user_id_name_key'
    ) THEN
        ALTER TABLE "pipeline_columns" 
        ADD CONSTRAINT "pipeline_columns_company_id_user_id_name_key" 
        UNIQUE ("company_id", "user_id", "name");
    END IF;
END $$;

-- Add foreign key to companies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pipeline_columns_company_id_fkey'
    ) THEN
        ALTER TABLE "pipeline_columns" 
        ADD CONSTRAINT "pipeline_columns_company_id_fkey" 
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Now create ticket_comments table
CREATE TABLE IF NOT EXISTS "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ticket_comments
CREATE INDEX IF NOT EXISTS "ticket_comments_ticket_id_idx" ON "ticket_comments"("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_comments_user_id_idx" ON "ticket_comments"("user_id");

-- Add foreign keys for ticket_comments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ticket_comments_ticket_id_fkey'
    ) THEN
        ALTER TABLE "ticket_comments" 
        ADD CONSTRAINT "ticket_comments_ticket_id_fkey" 
        FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ticket_comments_user_id_fkey'
    ) THEN
        ALTER TABLE "ticket_comments" 
        ADD CONSTRAINT "ticket_comments_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
