CREATE TABLE "archived_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "deleted_by_id" TEXT NOT NULL,

    CONSTRAINT "archived_users_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quotes"
    DROP CONSTRAINT IF EXISTS "quotes_created_by_fkey";

ALTER TABLE "templates"
    DROP CONSTRAINT IF EXISTS "templates_created_by_fkey";

ALTER TABLE "ticket_comments"
    DROP CONSTRAINT IF EXISTS "ticket_comments_user_id_fkey";
