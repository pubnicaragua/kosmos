const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.customRole.findFirst({
    where: { name: 'Inventario' },
    include: { permissions: true }
  });
  console.log(JSON.stringify(role, null, 2));
}

main().finally(() => prisma.$disconnect());
