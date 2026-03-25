const { execSync } = require('child_process');

console.log('🔄 Regenerando Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('✅ Prisma Client regenerado correctamente');
console.log('\n📝 Para aplicar la migración en producción, ejecuta:');
console.log('   npx prisma migrate deploy');
