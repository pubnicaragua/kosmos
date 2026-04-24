-- Fix Ticket model to use proper enums for status and priority

-- Update existing tickets to use valid enum values
UPDATE tickets SET status = 'NUEVO' WHERE status NOT IN ('NUEVO', 'ASIGNADO', 'EN_PROCESO', 'ESPERA_CLIENTE', 'ESPERA_REPUESTO', 'ESCALADO', 'RESUELTO', 'CERRADO', 'CANCELADO');
UPDATE tickets SET priority = 'MEDIA' WHERE priority NOT IN ('BAJA', 'MEDIA', 'ALTA');

-- Alter columns to use enums
ALTER TABLE tickets ALTER COLUMN status TYPE "TicketStatus" USING status::"TicketStatus";
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'NUEVO'::"TicketStatus";

ALTER TABLE tickets ALTER COLUMN priority TYPE "TicketPriority" USING priority::"TicketPriority";
ALTER TABLE tickets ALTER COLUMN priority SET DEFAULT 'MEDIA'::"TicketPriority";
ALTER TABLE tickets ALTER COLUMN priority SET NOT NULL;
