-- Allow free-text ticket types
ALTER TABLE "tickets" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "tickets" ALTER COLUMN "type" SET DEFAULT 'SOPORTE_REMOTO';
