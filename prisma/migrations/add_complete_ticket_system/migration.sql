-- AlterTable
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticket_number" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "equipment_type" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "equipment_brand" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "equipment_model" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "installation_date" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "installed_by" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "evidence" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "response_time" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolution_time" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "reopened_count" INTEGER DEFAULT 0;

-- Update existing tickets with ticket numbers
UPDATE "tickets" 
SET "ticket_number" = 'TKT-' || LPAD(CAST(row_num AS TEXT), 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM "tickets"
  WHERE "ticket_number" IS NULL
) AS numbered
WHERE "tickets".id = numbered.id;

-- Update existing tickets with default type
UPDATE "tickets" SET "type" = 'SOPORTE_REMOTO' WHERE "type" IS NULL;

-- Make ticket_number NOT NULL and UNIQUE
ALTER TABLE "tickets" ALTER COLUMN "ticket_number" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- Make type NOT NULL
ALTER TABLE "tickets" ALTER COLUMN "type" SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "tickets_type_idx" ON "tickets"("type");
CREATE INDEX IF NOT EXISTS "tickets_client_id_idx" ON "tickets"("client_id");
CREATE INDEX IF NOT EXISTS "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- Change description to TEXT type
ALTER TABLE "tickets" ALTER COLUMN "description" TYPE TEXT;
