-- Preserve old document-state values as historical metadata while making
-- pipeline_stage the only active quotation state.
-- Reclassify every existing quote from its previous status without deleting
-- the quote or changing its business data. Keep a migration audit event when
-- the active stage changes.
WITH target_stage AS (
    SELECT
        "id",
        "pipeline_stage" AS "from_stage",
        CASE "status"::text
            WHEN 'DRAFT' THEN 'PROSPECTO'::"QuotePipelineStage"
            WHEN 'SENT' THEN 'NEGOCIACION'::"QuotePipelineStage"
            WHEN 'APPROVED' THEN 'REALIZADA'::"QuotePipelineStage"
            WHEN 'REJECTED' THEN 'RECHAZADA'::"QuotePipelineStage"
            WHEN 'EXPIRED' THEN 'RECHAZADA'::"QuotePipelineStage"
            ELSE "pipeline_stage"
        END AS "to_stage"
    FROM "quotes"
), changed AS (
    UPDATE "quotes" AS q
    SET "pipeline_stage" = target."to_stage"
    FROM target_stage AS target
    WHERE q."id" = target."id"
      AND q."pipeline_stage" IS DISTINCT FROM target."to_stage"
    RETURNING q."id", q."pipeline_stage" AS "to_stage"
)
INSERT INTO "quote_stage_history" (
    "id", "quote_id", "from_stage", "to_stage", "actor_id", "actor_name", "source"
)
SELECT
    'quote-stage-status-mapping-' || changed."id",
    changed."id",
    target."from_stage",
    changed."to_stage",
    NULL,
    'Migración del sistema',
    'MIGRATION'
FROM changed
JOIN target_stage AS target ON target."id" = changed."id";

ALTER TYPE "QuoteStatus" RENAME TO "LegacyQuoteDocumentStatus";

ALTER TABLE "quotes" RENAME COLUMN "status" TO "legacy_document_status";
ALTER TABLE "quotes" ALTER COLUMN "legacy_document_status" DROP DEFAULT;
ALTER TABLE "quotes" ALTER COLUMN "legacy_document_status" DROP NOT NULL;

ALTER INDEX "quotes_status_idx" RENAME TO "quotes_legacy_document_status_idx";
