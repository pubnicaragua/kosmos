-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CONTADO', 'CREDITO');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "ruc" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CONTADO',
ADD COLUMN     "tax_applies" BOOLEAN NOT NULL DEFAULT true;
