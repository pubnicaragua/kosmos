import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mojibake fix: bytes UTF-8 de vocales con tilde interpretados como Latin-1
const replacements: Array<[RegExp, string]> = [
  [/aprobaciÃ³n/g, 'aprobación'],
  [/cotizaciÃ³n/g, 'cotización'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã¡/g, 'á'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã±/g, 'ñ'],
  [/Ã/g, 'Á'],
  [/Ã‰/g, 'É'],
  [/Ã"/g, 'Í'],
  [/Ã"/g, 'Ó'],
  [/Ãš/g, 'Ú'],
]

async function main() {
  const notifications = await prisma.notification.findMany({})
  let updated = 0

  for (const n of notifications) {
    let newTitle = n.title
    let newMessage = n.message
    for (const [re, ch] of replacements) {
      newTitle = newTitle.replace(re, ch)
      newMessage = newMessage.replace(re, ch)
    }
    if (newTitle !== n.title || newMessage !== n.message) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { title: newTitle, message: newMessage },
      })
      updated += 1
    }
  }

  console.log(`Notificaciones revisadas: ${notifications.length}`)
  console.log(`Notificaciones corregidas: ${updated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
