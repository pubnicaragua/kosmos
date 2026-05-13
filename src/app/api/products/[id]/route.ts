import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return apiError('Producto no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, product.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        sku: body.sku,
        description: body.description,
        categoryId: body.categoryId,
        unit: body.unit,
        stock: body.stock,
        minStock: body.minStock,
        cost: body.cost,
        price: body.price,
        isActive: body.isActive,
      },
      include: { category: { select: { name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating product:', error)
    return apiError('Error al actualizar producto', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return apiError('Producto no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, product.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.product.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Producto eliminado' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return apiError('Error al eliminar producto', 500)
  }
}
