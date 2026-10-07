-- Add account lifecycle fields without deleting users or changing existing relationships.
ALTER TABLE "users"
    ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN "deactivated_at" TIMESTAMP(3),
    ADD COLUMN "deactivated_by_id" TEXT;

ALTER TABLE "user_companies"
    ADD COLUMN "ended_at" TIMESTAMP(3);

ALTER TABLE "user_departments"
    ADD COLUMN "ended_at" TIMESTAMP(3);

ALTER TABLE "refresh_tokens"
    ADD COLUMN "revoked_at" TIMESTAMP(3);
