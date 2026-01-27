import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('UNAUTHORIZED', 'Token inválido o expirado', 401)
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: payload.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map(uc => uc.companyId)

    if (companyId && !companyIds.includes(companyId)) {
      return errorResponse('FORBIDDEN', 'No tienes acceso a esta empresa', 403)
    }

    const whereClause: any = {
      companyId: companyId ? companyId : { in: companyIds },
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    const [totalIncomes, pendingIncomes, averageSale, invoiceCount] = await Promise.all([
      prisma.income.aggregate({
        where: { ...whereClause, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { ...whereClause, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.income.aggregate({
        where: { ...whereClause, status: 'PAID' },
        _avg: { amount: true },
      }),
      prisma.income.count({ where: whereClause }),
    ])

    const previousPeriodWhere = { ...whereClause }
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diff = end.getTime() - start.getTime()
      previousPeriodWhere.date = {
        gte: new Date(start.getTime() - diff),
        lte: start,
      }
    }

    const previousTotal = await prisma.income.aggregate({
      where: { ...previousPeriodWhere, status: 'PAID' },
      _sum: { amount: true },
    })

    const previousAverage = await prisma.income.aggregate({
      where: { ...previousPeriodWhere, status: 'PAID' },
      _avg: { amount: true },
    })

    const totalGrowth = previousTotal._sum.amount
      ? ((totalIncomes._sum.amount || 0) - previousTotal._sum.amount) / previousTotal._sum.amount * 100
      : 0

    const averageGrowth = previousAverage._avg.amount
      ? ((averageSale._avg.amount || 0) - previousAverage._avg.amount) / previousAverage._avg.amount * 100
      : 0

    return successResponse({
      totalIncomes: totalIncomes._sum.amount || 0,
      totalGrowth,
      pendingIncomes: pendingIncomes._sum.amount || 0,
      pendingCount: pendingIncomes._count,
      averageSale: averageSale._avg.amount || 0,
      averageGrowth,
    })
  } catch (error) {
    console.error('Incomes summary error:', error)
    return errorResponse('SERVER_ERROR', 'Error al obtener el resumen de ingresos', 500)
  }
}
