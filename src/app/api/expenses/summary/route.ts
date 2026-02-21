import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {
      companyId: companyId || { in: companyIds },
    }

    const hasCustomRange = Boolean(startDateParam || endDateParam)
    if (hasCustomRange) {
      where.date = {}
      if (startDateParam) {
        const startDate = new Date(startDateParam)
        startDate.setHours(0, 0, 0, 0)
        where.date.gte = startDate
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
        where.date.lte = endDate
      }
    }

    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [currentRangeExpenses, previousRangeExpenses, pendingExpenses, paidExpenses] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...where,
          ...(hasCustomRange ? {} : { date: { gte: firstDayThisMonth } }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          ...(hasCustomRange
            ? { date: { gte: firstDayLastMonth, lte: lastDayLastMonth } }
            : { date: { gte: firstDayLastMonth, lte: lastDayLastMonth } }),
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          status: 'PENDING',
          ...(hasCustomRange ? {} : { date: { gte: firstDayThisMonth } }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          status: 'PAID',
          ...(hasCustomRange ? {} : { date: { gte: firstDayThisMonth } }),
        },
        _sum: { amount: true },
      }),
    ])

    const totalExpenses = currentRangeExpenses._sum.amount || 0
    const lastMonthTotal = previousRangeExpenses._sum.amount || 0
    const growth = lastMonthTotal > 0 
      ? ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100 
      : 0

    return apiSuccess({
      totalExpenses,
      totalGrowth: parseFloat(growth.toFixed(2)),
      paidExpenses: paidExpenses._sum.amount || 0,
      pendingExpenses: pendingExpenses._sum.amount || 0,
      pendingCount: pendingExpenses._count,
    })
  } catch (error) {
    console.error('Error fetching expenses summary:', error)
    return apiError('Error al obtener resumen de gastos', 500)
  }
}
