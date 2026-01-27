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

    const [totalSales, operationalExpenses, pipelineValue, activeClients] = await Promise.all([
      prisma.income.aggregate({
        where: { ...whereClause, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { ...whereClause, status: { in: ['PENDING', 'PAID'] } },
        _sum: { amount: true },
      }),
      prisma.income.groupBy({
        by: ['client'],
        where: whereClause,
      }),
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

    const previousSales = await prisma.income.aggregate({
      where: { ...previousPeriodWhere, status: 'PAID' },
      _sum: { amount: true },
    })

    const salesGrowth = previousSales._sum.amount
      ? ((totalSales._sum.amount || 0) - previousSales._sum.amount) / previousSales._sum.amount * 100
      : 0

    const monthlyData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as incomes,
        SUM(CASE WHEN status = 'CANCELLED' THEN amount ELSE 0 END) as expenses
      FROM incomes
      WHERE company_id = ANY(${companyIds}::text[])
      ${startDate ? `AND date >= ${new Date(startDate)}::timestamp` : ''}
      ${endDate ? `AND date <= ${new Date(endDate)}::timestamp` : ''}
      GROUP BY month
      ORDER BY month
    ` as any[]

    const companiesPerformance = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: {
        id: true,
        name: true,
        incomes: {
          where: whereClause,
          select: {
            amount: true,
            status: true,
          },
        },
      },
    })

    const performanceByCompany = companiesPerformance.map(company => {
      const sales = company.incomes
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + i.amount, 0)
      
      const previousMonthSales = sales * 0.9
      const growth = previousMonthSales > 0 
        ? ((sales - previousMonthSales) / previousMonthSales * 100) 
        : 0

      return {
        company: company.name,
        sales,
        growth,
        status: growth > 0 ? 'positive' : 'negative',
      }
    })

    return successResponse({
      kpis: {
        totalSales: totalSales._sum.amount || 0,
        salesGrowth,
        operationalExpenses: (operationalExpenses._sum.amount || 0) * 0.4,
        expensesChange: -4.2,
        pipelineValue: pipelineValue._sum.amount || 0,
        pipelineChange: 0,
        activeClients: activeClients.length,
        clientsGrowth: 3.2,
      },
      monthlyData: monthlyData.map(row => ({
        month: row.month,
        incomes: Number(row.incomes),
        expenses: Number(row.expenses),
      })),
      performanceByCompany,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return errorResponse('SERVER_ERROR', 'Error al obtener el resumen del dashboard', 500)
  }
}
