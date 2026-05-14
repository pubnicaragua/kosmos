import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@kosmoscrm.com' }
    })
    
    if (user) {
      console.log('✅ Usuario encontrado:', user.email)
      console.log('ID:', user.id)
    } else {
      console.log('❌ Usuario no encontrado en la base de datos.')
      const count = await prisma.user.count()
      console.log('Total usuarios en DB:', count)
    }
  } catch (err) {
    console.error('🚨 Error conectando a DB:', err)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
