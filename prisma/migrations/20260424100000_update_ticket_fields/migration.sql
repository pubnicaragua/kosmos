-- Migration to ensure all ticket fields exist without changing enum types
-- This is a safe migration that only adds missing columns if they don't exist

-- Add type column if it doesn't exist (as text, not enum)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tickets' AND column_name = 'type') THEN
    ALTER TABLE tickets ADD COLUMN type TEXT DEFAULT 'SOPORTE_REMOTO';
  END IF;
END $$;

-- Add branch column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tickets' AND column_name = 'branch') THEN
    ALTER TABLE tickets ADD COLUMN branch TEXT;
  END IF;
END $$;

-- Ensure status and priority are text columns (safe for existing data)
-- No type conversion, just ensure they exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tickets' AND column_name = 'status') THEN
    ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'NUEVO';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tickets' AND column_name = 'priority') THEN
    ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT 'MEDIA';
  END IF;
END $$;
