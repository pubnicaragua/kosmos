-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('NUEVO', 'RECURRENTE', 'PROYECTO');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "contact_name" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "assigned_to" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "client_type" "ClientType" DEFAULT 'NUEVO';
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "close_probability" INTEGER DEFAULT 50;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "issue_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);

-- Actualizar issue_date para cotizaciones existentes
UPDATE "quotes" SET "issue_date" = "created_at" WHERE "issue_date" IS NULL;

-- Hacer issue_date NOT NULL después de actualizar
ALTER TABLE "quotes" ALTER COLUMN "issue_date" SET NOT NULL;

-- Actualizar client_type para cotizaciones existentes basado en el cliente
UPDATE "quotes" SET "client_type" = 'RECURRENTE' 
WHERE "client_id" IN (
  SELECT "id" FROM "clients" WHERE "status" = 'ACTIVO'
);

-- Hacer client_type NOT NULL
ALTER TABLE "quotes" ALTER COLUMN "client_type" SET NOT NULL;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS "quotes_assigned_to_idx" ON "quotes"("assigned_to");
CREATE INDEX IF NOT EXISTS "quotes_client_type_idx" ON "quotes"("client_type");
