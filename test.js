const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const existing = await prisma.department.findFirst();
    if (!existing) {
      console.log('No departments found');
      return;
    }
    const res = await prisma.department.update({
      where: { id: existing.id },
      data: { name: existing.name },
      include: { userDepartments: true }
    });
    console.log('SUCCESS');
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
