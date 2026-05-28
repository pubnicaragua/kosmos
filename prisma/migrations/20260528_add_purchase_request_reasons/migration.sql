-- CreateTable
CREATE TABLE "purchase_request_reasons" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "request_type" "PurchaseRequestType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_request_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_request_reasons_company_id_idx" ON "purchase_request_reasons"("company_id");

-- CreateIndex
CREATE INDEX "purchase_request_reasons_request_type_idx" ON "purchase_request_reasons"("request_type");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_reasons_company_id_request_type_name_key" ON "purchase_request_reasons"("company_id", "request_type", "name");

-- AddForeignKey
ALTER TABLE "purchase_request_reasons" ADD CONSTRAINT "purchase_request_reasons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default reasons for each type
-- These will be company-specific, so we don't insert global defaults here
