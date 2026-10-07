import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies } from '@/lib/company-access'

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

    const where: any = {
      companyId: companyId || { in: companyIds }
    }

    // Obtener todos los productos y solicitudes
    const [products, purchaseRequests] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: companyId || { in: companyIds } },
        include: {
          purchaseRequestItems: {
            include: {
              purchaseRequest: true
            }
          }
        }
      }),
      prisma.purchaseRequest.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })
    ])

    // 1. Productos con stock bajo (stock < minStock)
    const lowStockProducts = products
      .filter(p => p.stock < (p.minStock || 0) && p.isActive)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.stock,
        minimumStock: p.minStock || 0,
        difference: (p.minStock || 0) - p.stock,
        category: p.categoryId
      }))
      .sort((a, b) => b.difference - a.difference)

    // 2. Top 20 productos más vendidos del mes (basado en solicitudes)
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const monthlyRequests = purchaseRequests.filter(
      pr => pr.createdAt >= firstDayOfMonth
    )

    const productSales: { [key: string]: { name: string; sku: string; quantity: number; category?: string } } = {}
    monthlyRequests.forEach(pr => {
      pr.items.forEach(item => {
        const key = item.productId || item.sku || item.productName
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            sku: item.sku || '',
            quantity: 0,
            category: item.category || undefined
          }
        }
        productSales[key].quantity += item.requestedQuantity
      })
    })

    const top20Products = Object.entries(productSales)
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20)

    // 3. Productos sin rotación en 90 días
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const noRotationProducts = products
      .filter(p => {
        const hasRecentRequest = p.purchaseRequestItems.some(
          item => item.createdAt >= ninetyDaysAgo
        )
        return !hasRecentRequest && p.isActive
      })
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.stock,
        cost: p.cost,
        totalValue: p.stock * p.cost
      }))
      .sort((a, b) => b.totalValue - a.totalValue)

    // 4. Productos más rentables (mayor margen)
    const profitableProducts = products
      .filter(p => p.isActive && p.publicPrice > p.cost)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        cost: p.cost,
        price: p.publicPrice,
        margin: p.publicPrice - p.cost,
        marginPercentage: ((p.publicPrice - p.cost) / (p.cost || 1) * 100).toFixed(2)
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 20)

    // 5. Tiempo promedio de reposición por proveedor
    // (Calculado como tiempo entre PENDIENTE y RECIBIDO)
    const completedRequests = purchaseRequests.filter(
      pr => pr.status === 'RECIBIDO' && pr.receivedAt
    )

    const avgReplenishmentTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, pr) => {
          const days = Math.floor(
            (pr.receivedAt!.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / completedRequests.length
      : 0

    // Estadísticas generales
    const totalRequests = purchaseRequests.length
    const pendingRequests = purchaseRequests.filter(pr => pr.status === 'PENDIENTE').length
    const approvedRequests = purchaseRequests.filter(pr => pr.status === 'APROBADA').length
    const rejectedRequests = purchaseRequests.filter(pr => pr.status === 'RECHAZADA').length
    const completedRequests_count = purchaseRequests.filter(pr => pr.status === 'RECIBIDO').length

    // Solicitudes por tipo
    const requestsByType: { [key: string]: number } = {}
    purchaseRequests.forEach(pr => {
      requestsByType[pr.requestType] = (requestsByType[pr.requestType] || 0) + 1
    })

    // Solicitudes por prioridad
    const requestsByPriority: { [key: string]: number } = {}
    purchaseRequests.forEach(pr => {
      requestsByPriority[pr.priority] = (requestsByPriority[pr.priority] || 0) + 1
    })

    const kpis = {
      lowStockProducts,
      top20Products,
      noRotationProducts,
      profitableProducts,
      avgReplenishmentTime: Math.round(avgReplenishmentTime * 10) / 10,
      statistics: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        completedRequests: completedRequests_count,
        requestsByType: Object.entries(requestsByType).map(([type, count]) => ({ type, count })),
        requestsByPriority: Object.entries(requestsByPriority).map(([priority, count]) => ({ priority, count })),
      }
    }

    return apiSuccess(kpis)
  } catch (error) {
    console.error('Error fetching purchase request KPIs:', error)
    return apiError('Error al obtener KPIs de solicitudes de compra', 500)
  }
}
