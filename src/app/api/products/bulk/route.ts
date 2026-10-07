import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { products, companyId, updateExisting } = body

    if (!Array.isArray(products) || products.length === 0) {
      return apiError('Debe proporcionar un array de productos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const sanitizedProducts = products.map((product: any, idx: number) => {
      const name = String(product.name || '').trim()
      let sku = String(product.sku || '').trim()
      if (!sku && name) {
        sku = `AUTO-${Date.now()}-${idx}`
      }
      return {
        name,
        unit: String(product.unit || 'UNI').trim() || 'UNI',
        categoryId: product.categoryId || null,
        description: product.description || null,
        sku,
        stock: Number(product.stock || 0),
        cost: Number(product.cost || 0),
        publicPrice: Number(product.publicPrice || 0),
        minPrice: Number(product.minPrice || 0),
        distributorPrice: Number(product.distributorPrice || 0),
        companyId,
      }
    })

    const validProducts = sanitizedProducts.filter((product: any) => product.name)
    if (!validProducts.length) {
      return apiError('No hay productos válidos para guardar (se requiere al menos el nombre)', 400)
    }

    if (updateExisting) {
      let created = 0
      let updated = 0
      let skipped = 0

      for (const product of validProducts) {
        const existing = await prisma.product.findFirst({
          where: {
            companyId,
            sku: product.sku,
          },
        })

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              unit: product.unit,
              categoryId: product.categoryId,
              description: product.description,
              stock: product.stock,
              cost: product.cost,
              publicPrice: product.publicPrice,
              minPrice: product.minPrice,
              distributorPrice: product.distributorPrice,
            },
          })
          updated++
        } else {
          try {
            await prisma.product.create({ data: product })
            created++
          } catch (error) {
            skipped++
          }
        }
      }

      return apiSuccess({
        created,
        updated,
        skipped,
        total: validProducts.length,
        message: `${created} productos creados, ${updated} actualizados`,
      })
    } else {
      const created = await prisma.product.createMany({
        data: validProducts,
        skipDuplicates: true,
      })

      return apiSuccess({
        count: created.count,
        total: validProducts.length,
        skipped: validProducts.length - created.count,
        message: `${created.count} productos creados`,
      })
    }
  } catch (error) {
    console.error('Error creating bulk products:', error)
    return apiError('Error al crear productos', 500)
  }
}
