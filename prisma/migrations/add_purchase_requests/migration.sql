-- CreateEnum
CREATE TYPE "PurchaseRequestType" AS ENUM ('REPOSICION', 'PRODUCTO_NUEVO', 'PEDIDO_ESPECIAL');
CREATE TYPE "PurchaseRequestPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA');
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'COMPRADO', 'RECIBIDO');

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesting_area" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "request_type" "PurchaseRequestType" NOT NULL DEFAULT 'REPOSICION',
    "priority" "PurchaseRequestPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "purchased_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "product_id" TEXT,
    "sku" TEXT,
    "product_name" TEXT NOT NULL,
    "category" TEXT,
    "current_stock" INTEGER,
    "minimum_stock" INTEGER,
    "requested_quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "last_sale_date" TIMESTAMP(3),
    "monthly_average" DOUBLE PRECISION,
    "unit_cost" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_request_number_key" ON "purchase_requests"("request_number");

-- CreateIndex
CREATE INDEX "purchase_requests_company_id_idx" ON "purchase_requests"("company_id");

-- CreateIndex
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");

-- CreateIndex
CREATE INDEX "purchase_requests_priority_idx" ON "purchase_requests"("priority");

-- CreateIndex
CREATE INDEX "purchase_requests_request_type_idx" ON "purchase_requests"("request_type");

-- CreateIndex
CREATE INDEX "purchase_requests_request_number_idx" ON "purchase_requests"("request_number");

-- CreateIndex
CREATE INDEX "purchase_request_items_purchase_request_id_idx" ON "purchase_request_items"("purchase_request_id");

-- CreateIndex
CREATE INDEX "purchase_request_items_product_id_idx" ON "purchase_request_items"("product_id");

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
