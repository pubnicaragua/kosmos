import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return NextResponse.json({ success: false, error: 'companyId requerido' }, { status: 400 })

    // 1. Stock Alerts (Productos con stock bajo el mínimo)
    const lowStockAlerts = await prisma.product.count({
      where: {
        companyId,
        stock: { lt: prisma.product.fields.minStock }
      }
    })

    // 2. Top 20 Vendidos (Basado en QuoteItems de cotizaciones aprobadas)
    const approvedQuotes = await prisma.quote.findMany({
      where: { companyId, status: 'APPROVED' },
      select: { id: true }
    })
    const quoteIds = approvedQuotes.map(q => q.id)

    const topProductsRaw = await prisma.quoteItem.groupBy({
      by: ['productId'],
      where: {
        quoteId: { in: quoteIds },
        productId: { not: null }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 20
    })

    const topProducts = await Promise.all(topProductsRaw.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId as string },
        select: { name: true, sku: true, price: true, cost: true }
      })
      return {
        name: product?.name || 'Desconocido',
        sku: product?.sku || 'N/A',
        totalSold: item._sum.quantity,
        revenue: (item._sum.quantity || 0) * (product?.price || 0),
        profit: (item._sum.quantity || 0) * ((product?.price || 0) - (product?.cost || 0))
      }
    }))

    // 3. Productos sin rotación (90 días)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const productsInQuotes = await prisma.quoteItem.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
        productId: { not: null }
      },
      select: { productId: true },
      distinct: ['productId']
    })
    const productIdsInQuotes = productsInQuotes.map(p => p.productId)

    const noRotation = await prisma.product.count({
      where: {
        companyId,
        id: { notIn: productIdsInQuotes as string[] }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          lowStock: lowStockAlerts,
          noRotation90: noRotation,
          activeRequests: await prisma.purchaseRequest.count({ where: { companyId, status: 'PENDIENTE' } })
        },
        topProducts
      }
    })
  } catch (error) {
    console.error('Error fetching purchase stats:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
