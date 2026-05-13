const fs = require('fs');
const path = require('path');

const modules = [
  { file: 'clientes/page.tsx', module: 'clientes', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'gastos/page.tsx', module: 'gastos', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'ingresos/page.tsx', module: 'ingresos', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'actividades/page.tsx', module: 'actividades', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'pipeline-ventas/page.tsx', module: 'pipeline-ventas', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'documentos/page.tsx', module: 'documentos', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'contratos/page.tsx', module: 'contratos', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'tickets-soporte/page.tsx', module: 'tickets-soporte', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'marketing/page.tsx', module: 'marketing', hasEdit: true, hasDelete: true, hasCreate: true },
  { file: 'solicitudes-compra/page.tsx', module: 'solicitudes-compra', hasEdit: true, hasDelete: false, hasCreate: true },
  { file: 'recursos-humanos/page.tsx', module: 'empleados', hasEdit: true, hasDelete: true, hasCreate: true },
];

const dashboardDir = path.join(__dirname, 'src', 'app', '(dashboard)');

modules.forEach(({ file, module }) => {
  const filePath = path.join(dashboardDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has useModulePermissions
  if (content.includes('useModulePermissions')) {
    console.log(`✅ Already has permissions: ${file}`);
    return;
  }

  // Add import
  if (!content.includes("import { useModulePermissions }")) {
    const importMatch = content.match(/^(import .+ from .+\n)+/m);
    if (importMatch) {
      const lastImport = importMatch[0];
      content = content.replace(
        lastImport,
        lastImport + "import { useModulePermissions } from '@/hooks/useModulePermissions'\n"
      );
    }
  }

  // Add hook usage after component declaration
  const componentMatch = content.match(/export default function \w+\(\) \{/);
  if (componentMatch) {
    const insertPos = componentMatch.index + componentMatch[0].length;
    const hookLine = `\n  const permissions = useModulePermissions('${module}')`;
    content = content.slice(0, insertPos) + hookLine + content.slice(insertPos);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Applied permissions to: ${file}`);
});

console.log('\n✅ Done! Now manually wrap buttons with permission checks.');
