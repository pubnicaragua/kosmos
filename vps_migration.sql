-- Añadir columnas a la tabla documents (si no existen)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "area" TEXT DEFAULT 'General';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "visibility" TEXT DEFAULT 'COMPARTIDO';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "shared_with" TEXT;

-- Actualizar filas existentes para que tengan los valores por defecto correctos
UPDATE "documents" SET "area" = 'General' WHERE "area" IS NULL;
UPDATE "documents" SET "visibility" = 'COMPARTIDO' WHERE "visibility" IS NULL;
