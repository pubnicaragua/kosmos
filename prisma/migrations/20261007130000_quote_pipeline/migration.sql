CREATE TYPE "QuotePipelineStage" AS ENUM (
    'PROSPECTO',
    'PROPUESTA',
    'NEGOCIACION',
    'REALIZADA',
    'RECHAZADA'
);

CREATE TYPE "QuoteStageHistorySource" AS ENUM ('USER', 'MIGRATION');

ALTER TABLE "quotes"
    ADD COLUMN "pipeline_stage" "QuotePipelineStage" NOT NULL DEFAULT 'PROSPECTO';

-- Only SENT has an unambiguous proposal-stage meaning in the legacy document status.
-- APPROVED and REJECTED can represent discount decisions, so do not infer commercial outcomes.
UPDATE "quotes"
SET "pipeline_stage" = CASE
    WHEN "status"::text = 'SENT' THEN 'PROPUESTA'::"QuotePipelineStage"
    ELSE 'PROSPECTO'::"QuotePipelineStage"
END;

CREATE TABLE "quote_stage_history" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "from_stage" "QuotePipelineStage",
    "to_stage" "QuotePipelineStage" NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "QuoteStageHistorySource" NOT NULL DEFAULT 'USER',
    CONSTRAINT "quote_stage_history_pkey" PRIMARY KEY ("id")
);

-- Mark the one-time classification as a system migration, not as a user movement.
INSERT INTO "quote_stage_history" (
    "id", "quote_id", "from_stage", "to_stage", "actor_id", "actor_name", "source"
)
SELECT
    'quote-stage-migration-' || "id",
    "id",
    NULL,
    "pipeline_stage",
    NULL,
    'Migración del sistema',
    'MIGRATION'
FROM "quotes";

CREATE INDEX "quotes_pipeline_stage_idx" ON "quotes"("pipeline_stage");
CREATE INDEX "quote_stage_history_quote_id_changed_at_idx"
    ON "quote_stage_history"("quote_id", "changed_at");
CREATE INDEX "quote_stage_history_actor_id_idx" ON "quote_stage_history"("actor_id");

ALTER TABLE "quote_stage_history"
    ADD CONSTRAINT "quote_stage_history_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
