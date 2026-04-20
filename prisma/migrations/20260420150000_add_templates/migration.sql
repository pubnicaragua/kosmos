-- Create TemplateType enum
DO $$ BEGIN
  CREATE TYPE "TemplateType" AS ENUM ('EDITABLE', 'STATIC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create templates table
CREATE TABLE IF NOT EXISTS "templates" (
  "id" VARCHAR(40) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "type" "TemplateType" NOT NULL,
  "file_url" TEXT,
  "content" TEXT,
  "module" VARCHAR(50) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "company_id" VARCHAR(40) NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created_by" VARCHAR(40) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "templates_company_id_idx" ON "templates"("company_id");
CREATE INDEX IF NOT EXISTS "templates_module_idx" ON "templates"("module");