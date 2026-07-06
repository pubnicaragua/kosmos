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

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, products } = body

    if (!companyId || !products || !Array.isArray(products)) {
      return apiError('Datos inválidos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const { getModuleAccess } = await import('@/lib/company-access')
    const moduleAccess = await getModuleAccess(decoded.userId, companyId, 'inventario')
    if (!moduleAccess.canCreate) return apiError('No tienes permisos para crear/importar inventario', 403)

    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      details: [] as any[],
    }

    for (const row of products) {
      try {
        // Detección case-insensitive de columnas
        const normalizedRow: any = {}
        for (const key in row) {
          const lowerKey = key.toLowerCase()
          if (lowerKey === 'nombre' || lowerKey === 'producto' || lowerKey === 'articulo' || lowerKey === 'name') {
            normalizedRow.name = row[key]
          } else if (lowerKey === 'sku' || lowerKey === 'codigo' || lowerKey === 'code') {
            normalizedRow.sku = row[key]
          } else if (lowerKey === 'categoria' || lowerKey === 'category') {
            normalizedRow.category = row[key]
          } else if (lowerKey === 'precio' || lowerKey === 'price') {
            normalizedRow.price = parseFloat(String(row[key]).replace(/[^0-9.]/g, '')) || 0
          } else if (lowerKey === 'costo' || lowerKey === 'cost') {
            normalizedRow.cost = parseFloat(String(row[key]).replace(/[^0-9.]/g, '')) || 0
          } else if (lowerKey === 'stock' || lowerKey === 'cantidad' || lowerKey === 'quantity') {
            normalizedRow.stock = parseInt(String(row[key]).replace(/[^0-9]/g, '')) || 0
          } else if (lowerKey === 'stockminimo' || lowerKey === 'minstock' || lowerKey === 'stock_minimo') {
            normalizedRow.minStock = parseInt(String(row[key]).replace(/[^0-9]/g, '')) || 0
          } else if (lowerKey === 'descripcion' || lowerKey === 'description') {
            normalizedRow.description = row[key]
          }
        }

        // Validar que tenga al menos nombre o SKU
        if (!normalizedRow.name && !normalizedRow.sku) {
          results.skipped++
          results.details.push({ row: normalizedRow, error: 'Sin nombre ni SKU' })
          continue
        }

        // Verificar si ya existe por SKU
        if (normalizedRow.sku) {
          const existing = await prisma.product.findFirst({
            where: {
              companyId,
              sku: normalizedRow.sku,
            },
          })

          if (existing) {
            results.skipped++
            results.details.push({ row: normalizedRow, error: 'SKU ya existe' })
            continue
          }
        }

        let categoryId = null
        if (normalizedRow.category) {
          const cat = await prisma.productCategory.findFirst({
            where: { companyId, name: String(normalizedRow.category) }
          })
          if (cat) {
            categoryId = cat.id
          } else {
            const newCat = await prisma.productCategory.create({
              data: { companyId, name: String(normalizedRow.category) }
            })
            categoryId = newCat.id
          }
        }

        const basePrice = normalizedRow.price || 0

        // Crear producto
        await prisma.product.create({
          data: {
            name: normalizedRow.name || normalizedRow.sku,
            sku: normalizedRow.sku || `AUTO-${Date.now()}`,
            categoryId,
            publicPrice: basePrice,
            minPrice: basePrice * 0.9,
            distributorPrice: basePrice * 0.8,
            cost: normalizedRow.cost || 0,
            stock: normalizedRow.stock || 0,
            minStock: normalizedRow.minStock || 0,
            description: normalizedRow.description || null,
            companyId,
          },
        })

        results.success++
      } catch (err: any) {
        results.errors++
        results.details.push({ row, error: err.message })
      }
    }

    return apiSuccess({
      message: `Importación completada: ${results.success} exitosos, ${results.skipped} omitidos, ${results.errors} errores`,
      ...results,
    })
  } catch (error: any) {
    console.error('Error importing products:', error)
    return apiError(`Error al importar productos: ${error.message}`, 500)
  }
}
