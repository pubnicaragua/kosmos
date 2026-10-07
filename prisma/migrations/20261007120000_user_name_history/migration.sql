CREATE TABLE "user_name_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "changed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_name_history_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_name_history" (
    "id", "user_id", "name", "valid_from", "valid_to", "changed_by_id"
)
SELECT
    'legacy-name-' || "id",
    "id",
    "name",
    CURRENT_TIMESTAMP,
    NULL,
    NULL
FROM "users";

CREATE INDEX "user_name_history_user_id_valid_from_valid_to_idx"
    ON "user_name_history"("user_id", "valid_from", "valid_to");
