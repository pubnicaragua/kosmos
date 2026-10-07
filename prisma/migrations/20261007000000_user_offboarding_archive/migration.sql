-- Preserve user identity and every dependent row when an account is offboarded.
-- Preference rows may be absent in older installations; create the table without removing any existing data.
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "ticket_columns" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_key" ON "user_preferences"("user_id");

CREATE TABLE "archived_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "user_created_at" TIMESTAMP(3) NOT NULL,
    "user_updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_by_id" TEXT,
    CONSTRAINT "archived_users_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "archived_users_email_idx" ON "archived_users"("email");

ALTER TABLE "user_companies"
    ADD COLUMN "archived_user_id" TEXT,
    ADD COLUMN "ended_at" TIMESTAMP(3),
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "refresh_tokens"
    ADD COLUMN "archived_user_id" TEXT,
    ADD COLUMN "revoked_at" TIMESTAMP(3),
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "quotes"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "ticket_comments"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "ticket_members"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "notifications"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "templates"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "user_departments"
    ADD COLUMN "archived_user_id" TEXT,
    ADD COLUMN "ended_at" TIMESTAMP(3),
    ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "user_preferences"
    ADD COLUMN "archived_user_id" TEXT,
    ALTER COLUMN "user_id" DROP NOT NULL;

-- Remove any legacy user foreign key name so no old CASCADE remains active.
DO $$
DECLARE
    existing_fk RECORD;
BEGIN
    FOR existing_fk IN
        SELECT conrelid::regclass AS table_name, conname
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'users'::regclass
          AND conrelid::regclass::text IN (
              'user_companies', 'refresh_tokens', 'quotes', 'ticket_comments',
              'ticket_members', 'notifications', 'templates', 'user_departments',
              'user_preferences'
          )
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', existing_fk.table_name, existing_fk.conname);
    END LOOP;
END $$;

ALTER TABLE "user_companies"
    ADD CONSTRAINT "user_companies_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "user_companies_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "refresh_tokens_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes"
    ADD CONSTRAINT "quotes_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "quotes_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_comments"
    ADD CONSTRAINT "ticket_comments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ticket_comments_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_members"
    ADD CONSTRAINT "ticket_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ticket_members_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "notifications_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "templates"
    ADD CONSTRAINT "templates_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "templates_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_departments"
    ADD CONSTRAINT "user_departments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "user_departments_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "user_preferences_archived_user_id_fkey"
    FOREIGN KEY ("archived_user_id") REFERENCES "archived_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "user_companies_archived_user_id_idx" ON "user_companies"("archived_user_id");
CREATE INDEX "refresh_tokens_archived_user_id_idx" ON "refresh_tokens"("archived_user_id");
CREATE INDEX "quotes_archived_user_id_idx" ON "quotes"("archived_user_id");
CREATE INDEX "ticket_comments_archived_user_id_idx" ON "ticket_comments"("archived_user_id");
CREATE INDEX "ticket_members_archived_user_id_idx" ON "ticket_members"("archived_user_id");
CREATE INDEX "notifications_archived_user_id_idx" ON "notifications"("archived_user_id");
CREATE INDEX "templates_archived_user_id_idx" ON "templates"("archived_user_id");
CREATE INDEX "user_departments_archived_user_id_idx" ON "user_departments"("archived_user_id");
CREATE INDEX "user_preferences_archived_user_id_idx" ON "user_preferences"("archived_user_id");
