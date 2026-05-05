-- Add missing ticket flags
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "has_charge" BOOLEAN NOT NULL DEFAULT false;
