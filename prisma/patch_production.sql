-- ============================================================
-- PATCH DE PRODUCCIÓN - Columnas faltantes en base de datos
-- Ejecutar en el servidor de producción (PostgreSQL)
-- Fecha: 2026-02-27
-- ============================================================

-- 1. Tabla documents: agregar columnas area, visibility, category
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "area" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'COMPARTIDO';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'General';

-- 2. Tabla opportunities: agregar columna priority y description
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIA';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 3. Tabla payrolls: crear si no existe (para el módulo RRHH)
CREATE TABLE IF NOT EXISTS "payrolls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notes" TEXT,
    "expenseId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- Índices para payrolls
CREATE INDEX IF NOT EXISTS "payrolls_companyId_idx" ON "payrolls"("companyId");
CREATE INDEX IF NOT EXISTS "payrolls_expenseId_idx" ON "payrolls"("expenseId");

-- Foreign keys para payrolls (solo si las tablas destino existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payrolls_companyId_fkey'
    ) THEN
        ALTER TABLE "payrolls"
            ADD CONSTRAINT "payrolls_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payrolls_expenseId_fkey'
    ) THEN
        ALTER TABLE "payrolls"
            ADD CONSTRAINT "payrolls_expenseId_fkey"
            FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Verificación: mostrar columnas agregadas
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('documents', 'opportunities', 'payrolls')
  AND column_name IN ('area', 'visibility', 'category', 'priority', 'description', 'totalAmount')
ORDER BY table_name, column_name;
