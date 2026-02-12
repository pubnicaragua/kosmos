-- Verificar empresas existentes
SELECT id, name, "is_active", "created_at" 
FROM companies 
ORDER BY "created_at" DESC;

-- Contar clientes por empresa
SELECT 
  c.name as empresa,
  COUNT(cl.id) as total_clientes
FROM companies c
LEFT JOIN clients cl ON cl.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Contar ingresos por empresa
SELECT 
  c.name as empresa,
  COUNT(i.id) as total_ingresos
FROM companies c
LEFT JOIN incomes i ON i.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Ver últimos clientes creados (si existen)
SELECT 
  cl.name as cliente,
  c.name as empresa,
  cl."created_at"
FROM clients cl
JOIN companies c ON c.id = cl.company_id
ORDER BY cl."created_at" DESC
LIMIT 20;
