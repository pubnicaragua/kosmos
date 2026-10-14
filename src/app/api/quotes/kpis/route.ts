import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies } from '@/lib/company-access'
import { QUOTE_PIPELINE_STAGES } from '@/lib/quote-pipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {
      companyId: companyId || { in: companyIds }
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {}
      if (startDateParam) {
        const startDate = new Date(startDateParam)
        startDate.setHours(0, 0, 0, 0)
        where.createdAt.gte = startDate
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    // Obtener todas las cotizaciones con items
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        },
        client: { select: { name: true } }
      }
    })

    // 1. Tasa de cierre (%)
    const totalQuotes = quotes.length
    const realizedQuotes = quotes.filter(q => q.pipelineStage === 'REALIZADA').length
    const rejectedQuotes = quotes.filter(q => q.pipelineStage === 'RECHAZADA').length
    const activeQuotes = quotes.filter(q =>
      q.pipelineStage === 'PROSPECTO' || q.pipelineStage === 'PROPUESTA' || q.pipelineStage === 'NEGOCIACION'
    )
    const closeRate = totalQuotes > 0 ? (realizedQuotes / totalQuotes * 100).toFixed(2) : '0.00'

    // 2. Tiempo promedio de cierre (días)
    const closedQuotes = quotes.filter(q => q.closedAt && q.issueDate)
    const avgCloseTime = closedQuotes.length > 0
      ? closedQuotes.reduce((sum, q) => {
          const days = Math.floor(
            (q.closedAt!.getTime() - q.issueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / closedQuotes.length
      : 0

    // 3. Cotizaciones enviadas por vendedor
    const quotesBySeller: { [key: string]: number } = {}
    quotes.forEach(q => {
      if (q.assignedTo) {
        quotesBySeller[q.assignedTo] = (quotesBySeller[q.assignedTo] || 0) + 1
      }
    })

    // Obtener nombres de vendedores
    const sellerIds = Object.keys(quotesBySeller)
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true }
    })

    const quotesBySeller_withNames = Object.entries(quotesBySeller).map(([id, count]) => {
      const seller = sellers.find(s => s.id === id)
      return {
        sellerId: id,
        sellerName: seller?.name || 'Sin asignar',
        count,
        realizedCount: quotes.filter(q => q.assignedTo === id && q.pipelineStage === 'REALIZADA').length,
        totalAmount: quotes
          .filter(q => q.assignedTo === id && q.pipelineStage === 'REALIZADA')
          .reduce((sum, q) => sum + q.total, 0)
      }
    }).sort((a, b) => b.count - a.count)

    // 4. Productos más cotizados
    const productCounts: { [key: string]: { name: string; sku: string; count: number; totalQuantity: number } } = {}
    quotes.forEach(quote => {
      quote.items.forEach(item => {
        const key = item.productId || item.description
        if (!productCounts[key]) {
          productCounts[key] = {
            name: item.product?.name || item.description,
            sku: item.product?.sku || '',
            count: 0,
            totalQuantity: 0
          }
        }
        productCounts[key].count++
        productCounts[key].totalQuantity += item.quantity
      })
    })

    const topProducts = Object.entries(productCounts)
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // 5. Monto total cotizado por mes
    const monthlyAmounts: { [key: string]: number } = {}
    quotes.forEach(q => {
      const monthKey = q.issueDate.toISOString().substring(0, 7) // YYYY-MM
      monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + q.total
    })

    const monthlyQuotedAmounts = Object.entries(monthlyAmounts)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // 6. Motivos de rechazo más frecuentes
    const rejectionReasons: { [key: string]: number } = {}
    quotes
      .filter(q => q.pipelineStage === 'RECHAZADA' && q.rejectionReason)
      .forEach(q => {
        const reason = q.rejectionReason!
        rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1
      })

    const topRejectionReasons = Object.entries(rejectionReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 7. Distribución por estado
    const quotesByStage: { [key: string]: number } = Object.fromEntries(
      QUOTE_PIPELINE_STAGES.map(stage => [stage, 0])
    )
    quotes.forEach(q => {
      quotesByStage[q.pipelineStage] = (quotesByStage[q.pipelineStage] || 0) + 1
    })

    // 8. Distribución por tipo de cliente
    const quotesByClientType: { [key: string]: number } = {}
    quotes.forEach(q => {
      quotesByClientType[q.clientType] = (quotesByClientType[q.clientType] || 0) + 1
    })

    // 9. Probabilidad promedio de cierre
    const quotesWithProbability = quotes.filter(q => q.closeProbability !== null)
    const avgCloseProbability = quotesWithProbability.length > 0
      ? quotesWithProbability.reduce((sum, q) => sum + (q.closeProbability || 0), 0) / quotesWithProbability.length
      : 0

    // 10. Cotizaciones vencidas
    const now = new Date()
    const expiredQuotes = activeQuotes.filter(q =>
      q.validUntil < now
    ).length

    // 11. Tiempo promedio de respuesta (días desde emisión hasta envío)
    const sentQuotes = quotes.filter(q => q.sentAt && q.issueDate)
    const avgResponseTime = sentQuotes.length > 0
      ? sentQuotes.reduce((sum, q) => {
          const days = Math.floor(
            (q.sentAt!.getTime() - q.issueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / sentQuotes.length
      : 0

    const kpis = {
      closeRate: parseFloat(closeRate),
      avgCloseTime: Math.round(avgCloseTime * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgCloseProbability: Math.round(avgCloseProbability * 10) / 10,
      totalQuotes,
      realizedQuotes,
      rejectedQuotes,
      expiredQuotes,
      activeQuotes: activeQuotes.length,
      totalQuotedAmount: quotes.reduce((sum, q) => sum + q.total, 0),
      totalRealizedAmount: quotes.filter(q => q.pipelineStage === 'REALIZADA').reduce((sum, q) => sum + q.total, 0),
      quotesBySeller: quotesBySeller_withNames,
      topProducts,
      monthlyQuotedAmounts,
      topRejectionReasons,
      quotesByStage: Object.entries(quotesByStage).map(([stage, count]) => ({ stage, count })),
      quotesByClientType: Object.entries(quotesByClientType).map(([type, count]) => ({ type, count })),
    }

    return apiSuccess(kpis)
  } catch (error) {
    console.error('Error fetching quote KPIs:', error)
    return apiError('Error al obtener KPIs de cotizaciones', 500)
  }
}
