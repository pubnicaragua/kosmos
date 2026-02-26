-- =====================================================
-- Script para crear tablas de Roles Personalizados
-- Ejecutar en producción: psql $DATABASE_URL -f add-custom-roles.sql
-- =====================================================

-- Crear tabla custom_roles si no existe
CREATE TABLE IF NOT EXISTS custom_roles (
  id           VARCHAR(30) PRIMARY KEY,
  company_id   VARCHAR(30) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  color        VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Crear tabla role_permissions si no existe
CREATE TABLE IF NOT EXISTS role_permissions (
  id              VARCHAR(30) PRIMARY KEY,
  custom_role_id  VARCHAR(30) NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  module          VARCHAR(100) NOT NULL,
  can_view        BOOLEAN NOT NULL DEFAULT false,
  can_create      BOOLEAN NOT NULL DEFAULT false,
  can_edit        BOOLEAN NOT NULL DEFAULT false,
  can_delete      BOOLEAN NOT NULL DEFAULT false,
  can_export      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(custom_role_id, module)
);

-- Agregar columna custom_role_id a user_companies si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_companies' AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE user_companies
      ADD COLUMN custom_role_id VARCHAR(30) REFERENCES custom_roles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna custom_role_id agregada a user_companies';
  ELSE
    RAISE NOTICE 'Columna custom_role_id ya existe en user_companies';
  END IF;
END $$;

-- Agregar FK si no existe (por si la columna ya existía sin FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'user_companies'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE user_companies
      ADD CONSTRAINT fk_user_companies_custom_role
      FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE SET NULL;
    RAISE NOTICE 'FK custom_role_id agregada';
  ELSE
    RAISE NOTICE 'FK custom_role_id ya existe';
  END IF;
END $$;

SELECT 'Tablas custom_roles y role_permissions listas.' AS resultado;
