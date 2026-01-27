import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { productCategorySchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (companyId) where.companyId = companyId

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

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = productCategorySchema.parse(body)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const category = await prisma.productCategory.create({
      data: validatedData,
    })

    return apiSuccess(category, undefined, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return apiError('Error al crear categoría', 500)
  }
}
