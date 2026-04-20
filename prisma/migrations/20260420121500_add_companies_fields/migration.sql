-- Add missing columns to companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_primary_color" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_header_html" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_footer_html" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_terms" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "invoice_primary_color" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "invoice_header_html" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "invoice_footer_html" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ticket_stages" JSONB;