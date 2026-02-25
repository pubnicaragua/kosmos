-- COMANDOS PARA LIMPIAR CLIENTES DE ITSI Y RAPIDUS
-- Ejecutar en la base de datos de producción

-- 1. Ver cuántos clientes hay de cada empresa antes de eliminar
SELECT c.name as company_name, COUNT(cl.id) as client_count
FROM "Client" cl
JOIN "Company" c ON cl."companyId" = c.id
WHERE c.name IN ('ITSI', 'Rapidus')
GROUP BY c.name;

-- 2. ELIMINAR CLIENTES DE ITSI
-- Primero obtener el ID de la empresa ITSI
DELETE FROM "Client"
WHERE "companyId" IN (
  SELECT id FROM "Company" WHERE name = 'ITSI'
);

-- 3. ELIMINAR CLIENTES DE RAPIDUS
-- Primero obtener el ID de la empresa Rapidus
DELETE FROM "Client"
WHERE "companyId" IN (
  SELECT id FROM "Company" WHERE name = 'Rapidus'
);

-- 4. Verificar que se eliminaron correctamente
SELECT c.name as company_name, COUNT(cl.id) as client_count
FROM "Client" cl
JOIN "Company" c ON cl."companyId" = c.id
WHERE c.name IN ('ITSI', 'Rapidus')
GROUP BY c.name;

-- ALTERNATIVA: Si quieres eliminar TODAS las empresas ITSI y Rapidus completamente
-- (incluyendo usuarios, oportunidades, tickets, etc.)
-- ADVERTENCIA: Esto eliminará TODOS los datos relacionados con estas empresas

-- Descomentar solo si estás seguro:
-- DELETE FROM "UserCompany" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Opportunity" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Ticket" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Contract" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Quote" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Product" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Expense" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Income" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Activity" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Document" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "MarketingCampaign" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Client" WHERE "companyId" IN (SELECT id FROM "Company" WHERE name IN ('ITSI', 'Rapidus'));
-- DELETE FROM "Company" WHERE name IN ('ITSI', 'Rapidus');

-- EJECUTAR EN PRODUCCIÓN:
-- 1. Conectarse a la base de datos:
--    psql -h localhost -U postgres -d kosmos_crm
-- 
-- 2. Copiar y pegar los comandos que necesites
-- 
-- 3. Verificar los resultados antes de continuar
