import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { productSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'
import { getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const categoryId = searchParams.get('categoryId')
    const categoryType = searchParams.get('categoryType')
    const stockFilter = searchParams.get('stockFilter')
    const search = searchParams.get('search')
    const sku = searchParams.get('sku')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const safePage = Number.isNaN(page) || page < 1 ? 1 : page
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100)
    const skip = (safePage - 1) * safeLimit

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    const allowedCompanyIds = []

    for (const cid of companyIds) {
      const moduleAccess = await getModuleAccess(decoded.userId, cid, 'inventario')
      if (moduleAccess.canView) {
        allowedCompanyIds.push(cid)
      }
    }

    const where: any = {}

    if (companyId) {
      if (!allowedCompanyIds.includes(companyId)) {
        return apiError('No tienes permisos para ver inventario en esta empresa', 403)
      }
      where.companyId = companyId
    } else {
      if (allowedCompanyIds.length === 0) {
        return apiError('No tienes permisos para ver inventario en ninguna empresa', 403)
      }
      where.companyId = { in: allowedCompanyIds }
    }
    if (categoryId) where.categoryId = categoryId
    if (!categoryId && categoryType === 'service') {
      where.category = {
        is: { name: { contains: 'servicio', mode: 'insensitive' } },
      }
    } else if (!categoryId && categoryType === 'product') {
      where.NOT = {
        category: { is: { name: { contains: 'servicio', mode: 'insensitive' } } },
      }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (stockFilter === 'high') {
      where.stock = { gte: 100 }
    } else if (stockFilter === 'low') {
      where.stock = { lte: 20 }
    }
    
    if (sku) {
      where.sku = sku
    }

    const [products, total, summaryProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          stock: true,
          cost: true,
        },
      }),
    ])

    const summary = summaryProducts.reduce(
      (acc, product) => {
        const stock = Number(product.stock) || 0
        const cost = Number(product.cost) || 0
        acc.totalStock += stock
        acc.lowStock += stock <= 20 ? 1 : 0
        acc.inventoryValue += stock * cost
        return acc
      },
      { totalStock: 0, lowStock: 0, inventoryValue: 0 }
    )

    return apiSuccess({
      data: products,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
      summary: {
        totalProducts: total,
        totalStock: summary.totalStock,
        lowStockProducts: summary.lowStock,
        inventoryValue: summary.inventoryValue,
      },
    })
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

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, validatedData.companyId, 'inventario')
    if (!moduleAccess.canCreate) return apiError('No tienes permisos para crear productos', 403)

    // Check for duplicate by SKU
    const existingProduct = await prisma.product.findFirst({
      where: {
        companyId: validatedData.companyId,
        sku: validatedData.sku,
      },
      include: {
        category: { select: { name: true } },
      },
    })

    if (existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'DUPLICATE_SKU',
        message: 'Ya existe un producto con este SKU',
        existingProduct: {
          id: existingProduct.id,
          name: existingProduct.name,
          sku: existingProduct.sku,
          stock: existingProduct.stock,
          price: existingProduct.price,
          cost: existingProduct.cost,
          categoryName: existingProduct.category?.name || null,
        },
        newData: {
          name: validatedData.name,
          stock: validatedData.stock || 0,
          price: validatedData.price,
          cost: validatedData.cost || 0,
        }
      }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: validatedData,
      include: {
        category: { select: { name: true } },
      },
    })

    return apiSuccess(product, undefined, 201)
  } catch (error: any) {
    console.error('Error creating product:', error)
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`Datos inválidos: ${issues}`, 400)
    }
    return apiError(`Error al crear producto: ${error?.message || error}`, 500)
  }
}
