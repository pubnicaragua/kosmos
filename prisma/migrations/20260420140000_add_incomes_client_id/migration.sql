-- Add client_id to incomes table
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "client_id" TEXT;