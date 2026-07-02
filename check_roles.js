const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.customRole.findMany({
    include: { permissions: true }
  });
  console.log(JSON.stringify(roles, null, 2));
}

main().finally(() => prisma.$disconnect());
