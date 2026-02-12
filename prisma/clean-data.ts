import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Limpiando datos antiguos de clientes e ingresos...')

  // Nombres de las 5 empresas reales
  const companyNames = [
    'Hotel Marbella',
    'ITSI',
    'Extel',
    'Rapidus',
    'Unitec'
  ]

  for (const companyName of companyNames) {
    const company = await prisma.company.findFirst({
      where: { name: companyName }
    })

    if (!company) {
      console.log(`⚠️  Empresa "${companyName}" no encontrada, saltando...`)
      continue
    }

    console.log(`\n📊 Limpiando datos de: ${companyName}`)

    // Borrar ingresos
    const deletedIncomes = await prisma.income.deleteMany({
      where: { companyId: company.id }
    })
    console.log(`   ✅ ${deletedIncomes.count} ingresos eliminados`)

    // Borrar cotizaciones (primero items, luego quotes)
    const quotes = await prisma.quote.findMany({
      where: { companyId: company.id },
      select: { id: true }
    })
    
    if (quotes.length > 0) {
      const quoteIds = quotes.map(q => q.id)
      const deletedQuoteItems = await prisma.quoteItem.deleteMany({
        where: { quoteId: { in: quoteIds } }
      })
      console.log(`   ✅ ${deletedQuoteItems.count} items de cotizaciones eliminados`)

      const deletedQuotes = await prisma.quote.deleteMany({
        where: { companyId: company.id }
      })
      console.log(`   ✅ ${deletedQuotes.count} cotizaciones eliminadas`)
    }

    // Borrar clientes
    const deletedClients = await prisma.client.deleteMany({
      where: { companyId: company.id }
    })
    console.log(`   ✅ ${deletedClients.count} clientes eliminados`)
  }

  console.log('\n✅ Limpieza completada!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
