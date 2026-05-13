/**
 * Script para agregar enforcement de roles a TODOS los módulos
 * Mapeo: API route → nombre de módulo en RolePermission
 */

const fs = require('fs');
const path = require('path');

const MODULE_MAP = {
  'clients': 'clientes',
  'quotes': 'cotizaciones',
  'contracts': 'contratos',
  'documents': 'documentos',
  'expenses': 'gastos',
  'incomes': 'ingresos',
  'activities': 'actividades',
  'marketing': 'marketing',
  'tickets': 'tickets-soporte',
  'employees': 'empleados',
  'payrolls': 'nomina',
  'opportunities': 'pipeline-ventas',
  'purchase-requests': 'solicitudes-compra',
  'departments': 'departamentos'
};

const API_BASE = 'src/app/api';

// Archivos a procesar con sus operaciones
const FILES_TO_PROCESS = [
  // Quotes
  { file: 'quotes/[id]/route.ts', module: 'cotizaciones', operations: ['PUT', 'DELETE'] },
  
  // Contracts
  { file: 'contracts/route.ts', module: 'contratos', operations: ['POST'] },
  { file: 'contracts/[id]/route.ts', module: 'contratos', operations: ['PUT', 'DELETE'] },
  
  // Documents
  { file: 'documents/route.ts', module: 'documentos', operations: ['POST'] },
  { file: 'documents/[id]/route.ts', module: 'documentos', operations: ['PUT', 'DELETE'] },
  
  // Expenses
  { file: 'expenses/route.ts', module: 'gastos', operations: ['POST'] },
  { file: 'expenses/[id]/route.ts', module: 'gastos', operations: ['PUT', 'DELETE'] },
  
  // Incomes
  { file: 'incomes/route.ts', module: 'ingresos', operations: ['POST'] },
  { file: 'incomes/[id]/route.ts', module: 'ingresos', operations: ['PUT', 'DELETE'] },
  
  // Activities
  { file: 'activities/route.ts', module: 'actividades', operations: ['POST'] },
  { file: 'activities/[id]/route.ts', module: 'actividades', operations: ['PUT', 'DELETE'] },
  
  // Marketing
  { file: 'marketing/route.ts', module: 'marketing', operations: ['POST'] },
  { file: 'marketing/[id]/route.ts', module: 'marketing', operations: ['PUT', 'DELETE'] },
  
  // Tickets
  { file: 'tickets/route.ts', module: 'tickets-soporte', operations: ['POST'] },
  { file: 'tickets/[id]/route.ts', module: 'tickets-soporte', operations: ['PUT', 'DELETE'] },
  
  // Opportunities (Pipeline)
  { file: 'opportunities/route.ts', module: 'pipeline-ventas', operations: ['POST'] },
  { file: 'opportunities/[id]/route.ts', module: 'pipeline-ventas', operations: ['PUT', 'DELETE'] },
  
  // Employees
  { file: 'employees/route.ts', module: 'empleados', operations: ['POST'] },
  { file: 'employees/[id]/route.ts', module: 'empleados', operations: ['PUT', 'DELETE'] },
  
  // Payrolls
  { file: 'payrolls/route.ts', module: 'nomina', operations: ['POST'] },
  { file: 'payrolls/[id]/route.ts', module: 'nomina', operations: ['PUT', 'DELETE'] },
];

function processFile(filePath, moduleName, operations) {
  const fullPath = path.join(API_BASE, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 1. Add getModuleAccess import if not present
  if (!content.includes('getModuleAccess')) {
    content = content.replace(
      /from '@\/lib\/company-access'/,
      (match) => {
        if (match.includes('getModuleAccess')) return match;
        return match.replace(
          /import \{ ([^}]+) \}/,
          (_, imports) => `import { ${imports}, getModuleAccess }`
        );
      }
    );
    modified = true;
  }
  
  // 2. Add permission checks for each operation
  operations.forEach(op => {
    const opLower = op.toLowerCase();
    const permission = op === 'POST' ? 'canCreate' : op === 'PUT' ? 'canEdit' : 'canDelete';
    const action = op === 'POST' ? 'crear' : op === 'PUT' ? 'editar' : 'eliminar';
    
    // Pattern: after getCompanyAccess check, before the main operation
    const pattern = new RegExp(
      `(const access = await getCompanyAccess\\([^)]+\\)[^}]+if \\(!access\\.canAccess\\)[^}]+\\})\\s*\\n\\s*\\n(\\s*)(const|await|let|return)`,
      'g'
    );
    
    const replacement = `$1\n\n$2const moduleAccess = await getModuleAccess(decoded.userId, ` +
      `${op === 'POST' ? 'validatedData.companyId' : 'resource.companyId'}, '${moduleName}')\n` +
      `$2if (!moduleAccess.${permission}) return apiError('No tienes permisos para ${action} en ${moduleName}', 403)\n\n$2$3`;
    
    if (pattern.test(content) && !content.includes(`moduleAccess.${permission}`)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
  } else {
    console.log(`⏭️  Skipped ${filePath} - already has enforcement or pattern not found`);
  }
}

console.log('🔒 Adding role enforcement to all modules...\n');

FILES_TO_PROCESS.forEach(({ file, module, operations }) => {
  processFile(file, module, operations);
});

console.log('\n✨ Done! Review changes and test.');
