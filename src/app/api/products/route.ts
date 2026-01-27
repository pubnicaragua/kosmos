import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { productSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const categoryId = searchParams.get('categoryId')
    const stockFilter = searchParams.get('stockFilter')

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (categoryId) where.categoryId = categoryId
    
    if (stockFilter === 'high') {
      where.stock = { gte: 100 }
    } else if (stockFilter === 'low') {
      where.stock = { lte: 20 }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return apiError('Error al obtener productos', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = productSchema.parse(body)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const product = await prisma.product.create({
      data: validatedData,
      include: {
        category: { select: { name: true } },
      },
    })

    return apiSuccess(product, undefined, 201)
  } catch (error) {
    console.error('Error creating product:', error)
    return apiError('Error al crear producto', 500)
  }
}
