import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { products, companyId } = body

    if (!Array.isArray(products) || products.length === 0) {
      return apiError('Debe proporcionar un array de productos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const sanitizedProducts = products.map((product: any, idx: number) => {
      const name = String(product.name || '').trim()
      // SKU es opcional - generar automático si no viene
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
        cost: Number(product.cost || 0),
        price: Number(product.price || 0),
        netMargin: product.netMargin === null || product.netMargin === undefined ? null : Number(product.netMargin),
        companyId,
      }
    })

    // Solo nombre es requerido, SKU se genera automáticamente si falta
    const validProducts = sanitizedProducts.filter((product: any) => product.name)
    if (!validProducts.length) {
      return apiError('No hay productos válidos para guardar (se requiere al menos el nombre)', 400)
    }

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
  } catch (error) {
    console.error('Error creating bulk products:', error)
    return apiError('Error al crear productos', 500)
  }
}
