-- Add missing columns to contracts
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "area" TEXT DEFAULT 'General';
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "visibility" TEXT DEFAULT 'COMPARTIDO';
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "shared_with" JSONB;

-- Add missing columns to payrolls
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "name" TEXT;