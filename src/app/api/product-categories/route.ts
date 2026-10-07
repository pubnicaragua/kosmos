import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { productCategorySchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId || { in: companyIds }

    const categories = await prisma.productCategory.findMany({
      where,
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })

    return apiSuccess(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return apiError('Error al obtener categorías', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = productCategorySchema.parse(body)

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const category = await prisma.productCategory.create({
      data: validatedData,
    })

    return apiSuccess(category, undefined, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return apiError('Error al crear categoría', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { id, name, description } = body

    if (!id) return apiError('ID de categoría requerido', 400)

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    })

    return apiSuccess(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return apiError('Error al actualizar categoría', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const id = String(body?.id || '').trim()
    if (!id) return apiError('ID de categoría requerido', 400)

    const category = await prisma.productCategory.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    })
    if (!category) return apiError('Categoría no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, category.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const result = await prisma.$transaction(async (tx) => {
      const detached = await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      })

      await tx.productCategory.delete({ where: { id } })

      return { detachedProducts: detached.count }
    })

    return apiSuccess({
      id,
      detachedProducts: result.detachedProducts,
      message: 'Categoría eliminada exitosamente',
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return apiError('Error al eliminar categoría', 500)
  }
}
