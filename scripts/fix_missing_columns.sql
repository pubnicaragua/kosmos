-- Script para agregar columnas faltantes en producción
-- Ejecutar en el servidor con: psql -U postgres -d kosmos_crm -f scripts/fix_missing_columns.sql

-- Ticket: agregar assigned_users, currency, start_date, attachments
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_users" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "attachments" TEXT;

-- Document: agregar shared_with
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "shared_with" TEXT;

-- Verificar columnas creadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('assigned_users', 'currency', 'start_date', 'attachments')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name = 'shared_with';
