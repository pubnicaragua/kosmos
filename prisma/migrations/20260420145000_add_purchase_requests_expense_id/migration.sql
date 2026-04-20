-- Add expense_id to purchase_requests if not exists
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "expense_id" TEXT;