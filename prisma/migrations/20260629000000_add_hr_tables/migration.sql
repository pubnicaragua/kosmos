-- Create employees table
CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "contract_type" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "address" TEXT,
    "birth_date" TIMESTAMP(3),
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "social_security_number" TEXT,
    "blood_type" TEXT,
    "education_level" TEXT,
    "benefits" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVO',
    "photo" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- Create payrolls table (if not already exists from patch)
CREATE TABLE IF NOT EXISTS "payrolls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
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

-- Indexes for employees
CREATE UNIQUE INDEX IF NOT EXISTS "employees_employee_code_key" ON "employees"("employee_code");
CREATE INDEX IF NOT EXISTS "employees_company_id_idx" ON "employees"("company_id");
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "employees_employee_code_idx" ON "employees"("employee_code");

-- Indexes for payrolls
CREATE INDEX IF NOT EXISTS "payrolls_companyId_idx" ON "payrolls"("companyId");
CREATE INDEX IF NOT EXISTS "payrolls_expenseId_idx" ON "payrolls"("expenseId");

-- Foreign keys for employees
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'employees_company_id_fkey'
    ) THEN
        ALTER TABLE "employees"
            ADD CONSTRAINT "employees_company_id_fkey"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign keys for payrolls
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
