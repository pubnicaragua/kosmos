ALTER TABLE "purchase_requests"
  ADD COLUMN IF NOT EXISTS "quotation_files" JSONB,
  ADD COLUMN IF NOT EXISTS "selected_quotation_url" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier_name" TEXT,
  ADD COLUMN IF NOT EXISTS "final_amount" DOUBLE PRECISION;
