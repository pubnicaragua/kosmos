-- Convert TicketPriority enum to TEXT
ALTER TABLE "tickets" ALTER COLUMN "priority" TYPE TEXT;
ALTER TABLE "tickets" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "priority" SET DEFAULT 'MEDIA';

-- Convert TicketStatus enum to TEXT
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'PROCESO1';

-- Add missing columns to marketing_campaigns
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "ad_type" TEXT;
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "approval_status" TEXT;
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "evidence_url" TEXT;