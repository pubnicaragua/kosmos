const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function addDynamicExport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dynamic export
  if (content.includes('export const dynamic')) {
    console.log(`✓ Skip: ${filePath}`);
    return;
  }
  
  // Find first import or first line
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      insertIndex = i + 1;
    }
    if (lines[i].trim().startsWith('export ') && !lines[i].includes('import')) {
      break;
    }
  }
  
  // Insert after imports
  lines.splice(insertIndex, 0, '', "export const dynamic = 'force-dynamic'");
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✓ Fixed: ${filePath}`);
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name === 'route.ts') {
      addDynamicExport(fullPath);
    }
  }
}

console.log('Adding dynamic exports to API routes...\n');
processDirectory(apiDir);
console.log('\n✓ Done!');
