const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.userDepartment.findFirst({
      select: { isReceiver: true }
    });
    console.log("Success! isReceiver exists. Result:", res);
  } catch(e) {
    console.error("Error:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
