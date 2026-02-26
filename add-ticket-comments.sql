-- Add ticket_comments table
CREATE TABLE IF NOT EXISTS "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ticket_comments_ticket_id_idx" ON "ticket_comments"("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_comments_user_id_idx" ON "ticket_comments"("user_id");

-- Add foreign keys
ALTER TABLE "ticket_comments" 
ADD CONSTRAINT "ticket_comments_ticket_id_fkey" 
FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_comments" 
ADD CONSTRAINT "ticket_comments_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update pipeline_columns to support per-user customization (if column doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_columns' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "pipeline_columns" ADD COLUMN "user_id" TEXT;
        CREATE INDEX IF NOT EXISTS "pipeline_columns_user_id_idx" ON "pipeline_columns"("user_id");
        
        -- Drop old unique constraint if exists
        ALTER TABLE "pipeline_columns" DROP CONSTRAINT IF EXISTS "pipeline_columns_company_id_name_key";
        
        -- Add new unique constraint
        ALTER TABLE "pipeline_columns" ADD CONSTRAINT "pipeline_columns_company_id_user_id_name_key" 
        UNIQUE ("company_id", "user_id", "name");
    END IF;
END $$;
