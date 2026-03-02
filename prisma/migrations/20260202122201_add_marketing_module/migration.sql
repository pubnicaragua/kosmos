-- CreateEnum
CREATE TYPE "MarketingStatus" AS ENUM ('PLANIFICACION', 'EN_CURSO', 'PAUSADA', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('REDES_SOCIALES', 'EMAIL', 'PUBLICIDAD_DIGITAL', 'CONTENIDO', 'EVENTOS', 'OTRO');

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "MarketingChannel" NOT NULL,
    "status" "MarketingStatus" NOT NULL DEFAULT 'PLANIFICACION',
    "budget" DOUBLE PRECISION,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "target_audience" TEXT,
    "metrics" TEXT,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_campaigns_company_id_idx" ON "marketing_campaigns"("company_id");

-- CreateIndex
CREATE INDEX "marketing_campaigns_status_idx" ON "marketing_campaigns"("status");

-- CreateIndex
CREATE INDEX "marketing_campaigns_channel_idx" ON "marketing_campaigns"("channel");

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
