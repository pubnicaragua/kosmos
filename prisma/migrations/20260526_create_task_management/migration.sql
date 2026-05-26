-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateTable: TaskList (Rutinas)
CREATE TABLE "task_lists" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "frequency" "TaskFrequency" NOT NULL DEFAULT 'DAILY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "require_evidence" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskTemplate (Pasos de una rutina)
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "task_list_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "require_photo" BOOLEAN NOT NULL DEFAULT false,
    "require_video" BOOLEAN NOT NULL DEFAULT false,
    "estimated_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskAssignment (Asignaciones)
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "task_list_id" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskExecution (Ejecución de cada paso)
CREATE TABLE "task_executions" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "evidence_photo_url" TEXT,
    "evidence_video_url" TEXT,
    "notes" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskNotification (Notificaciones)
CREATE TABLE "task_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TASK_ASSIGNED',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "sent_push" BOOLEAN NOT NULL DEFAULT false,
    "push_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PushSubscription (Para notificaciones push)
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "device_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_lists_company_id_idx" ON "task_lists"("company_id");
CREATE INDEX "task_lists_area_idx" ON "task_lists"("area");
CREATE INDEX "task_lists_frequency_idx" ON "task_lists"("frequency");

CREATE INDEX "task_templates_task_list_id_idx" ON "task_templates"("task_list_id");
CREATE INDEX "task_templates_order_idx" ON "task_templates"("order");

CREATE INDEX "task_assignments_company_id_idx" ON "task_assignments"("company_id");
CREATE INDEX "task_assignments_assigned_to_idx" ON "task_assignments"("assigned_to");
CREATE INDEX "task_assignments_status_idx" ON "task_assignments"("status");
CREATE INDEX "task_assignments_due_date_idx" ON "task_assignments"("due_date");

CREATE INDEX "task_executions_assignment_id_idx" ON "task_executions"("assignment_id");
CREATE INDEX "task_executions_completed_idx" ON "task_executions"("completed");

CREATE INDEX "task_notifications_user_id_idx" ON "task_notifications"("user_id");
CREATE INDEX "task_notifications_read_idx" ON "task_notifications"("read");

CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_task_list_id_fkey" FOREIGN KEY ("task_list_id") REFERENCES "task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_list_id_fkey" FOREIGN KEY ("task_list_id") REFERENCES "task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
