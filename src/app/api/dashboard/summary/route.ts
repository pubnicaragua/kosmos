import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: payload.userId },
      select: { companyId: true, role: true },
    })

    const isSuperAdmin = userCompanies.some((uc) => uc.role === 'SUPER_ADMIN')
    let companyIds = userCompanies.map((uc) => uc.companyId)

    if (isSuperAdmin) {
      const allCompanies = await prisma.company.findMany({
        select: { id: true },
      })
      companyIds = allCompanies.map((company) => company.id)
    }

    if (companyId && !companyIds.includes(companyId)) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const scopedCompanyIds = companyId ? [companyId] : companyIds
    const dateWhere: any = {}
    if (startDate) dateWhere.gte = new Date(startDate)
    if (endDate) dateWhere.lte = new Date(endDate)

    const incomeWhereClause: any = {
      companyId: { in: scopedCompanyIds },
    }
    const expenseWhereClause: any = {
      companyId: { in: scopedCompanyIds },
    }

    if (Object.keys(dateWhere).length > 0) {
      incomeWhereClause.date = dateWhere
      expenseWhereClause.date = dateWhere
    }

    const opportunityWhereClause: any = {
      companyId: { in: scopedCompanyIds },
    }
    if (Object.keys(dateWhere).length > 0) {
      opportunityWhereClause.createdAt = dateWhere
    }

    const [
      totalSales,
      operationalExpenses,
      pipelineValue,
      activeClients,
      incomeRows,
      expenseRows,
      currentNewClients,
      companyMeta,
      companySalesCurrent,
      resolvedTickets,
      totalTickets,
      marketingMetrics,
      activeContracts,
      wonOpportunities,
      lostOpportunities,
    ] = await Promise.all([
      prisma.income.aggregate({
        where: { ...incomeWhereClause, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...expenseWhereClause, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      prisma.opportunity.aggregate({
        where: opportunityWhereClause,
        _sum: { value: true },
      }),
      prisma.client.count({
        where: {
          companyId: { in: scopedCompanyIds },
          status: { not: 'INACTIVO' },
        },
      }),
      prisma.income.findMany({
        where: incomeWhereClause,
        select: {
          date: true,
          amount: true,
          status: true,
        },
      }),
      prisma.expense.findMany({
        where: expenseWhereClause,
        select: {
          date: true,
          amount: true,
          status: true,
        },
      }),
      prisma.client.count({
        where: {
          companyId: { in: scopedCompanyIds },
          ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
        },
      }),
      prisma.company.findMany({
        where: { id: { in: scopedCompanyIds } },
        select: {
          id: true,
          name: true,
          industry: true,
        },
      }),
      prisma.income.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: scopedCompanyIds },
          status: 'PAID',
          ...(incomeWhereClause.date ? { date: incomeWhereClause.date } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.ticket.count({
        where: {
          companyId: { in: scopedCompanyIds },
          status: { in: ['RESUELTO', 'CERRADO'] },
          ...(dateWhere.gte || dateWhere.lte ? { createdAt: dateWhere } : {}),
        },
      }),
      prisma.ticket.count({
        where: {
          companyId: { in: scopedCompanyIds },
          ...(dateWhere.gte || dateWhere.lte ? { createdAt: dateWhere } : {}),
        },
      }),
      prisma.marketingCampaign.aggregate({
        where: {
          companyId: { in: scopedCompanyIds },
          ...(dateWhere.gte || dateWhere.lte ? { createdAt: dateWhere } : {}),
        },
        _sum: { budget: true, spent: true },
      }),
      prisma.contract.count({
        where: {
          companyId: { in: scopedCompanyIds },
          status: 'ACTIVE',
        },
      }),
      prisma.opportunity.aggregate({
        where: {
          ...opportunityWhereClause,
          stage: 'CALIFICADO',
        },
        _sum: { value: true },
        _count: { id: true },
      }),
      prisma.opportunity.count({
        where: {
          ...opportunityWhereClause,
          stage: 'PROSPECTO',
        },
      }),
    ])

    const previousIncomeWhere: any = { ...incomeWhereClause }
    const previousExpenseWhere: any = { ...expenseWhereClause }
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diff = end.getTime() - start.getTime()
      const previousDateRange = {
        gte: new Date(start.getTime() - diff),
        lte: start,
      }

      previousIncomeWhere.date = previousDateRange
      previousExpenseWhere.date = previousDateRange
    }

    const previousOpportunityWhere: any = {
      companyId: { in: scopedCompanyIds },
    }
    if (previousIncomeWhere.date) {
      previousOpportunityWhere.createdAt = previousIncomeWhere.date
    }

    const [
      previousSales,
      previousExpenses,
      previousPipeline,
      previousNewClients,
      companySalesPrevious,
    ] = await Promise.all([
      prisma.income.aggregate({
        where: { ...previousIncomeWhere, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...previousExpenseWhere, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      prisma.opportunity.aggregate({
        where: previousOpportunityWhere,
        _sum: { value: true },
      }),
      prisma.client.count({
        where: {
          companyId: { in: scopedCompanyIds },
          ...(previousIncomeWhere.date ? { createdAt: previousIncomeWhere.date } : {}),
        },
      }),
      prisma.income.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: scopedCompanyIds },
          status: 'PAID',
          ...(previousIncomeWhere.date ? { date: previousIncomeWhere.date } : {}),
        },
        _sum: { amount: true },
      }),
    ])

    const salesGrowth = previousSales._sum.amount
      ? ((totalSales._sum.amount || 0) - previousSales._sum.amount) / previousSales._sum.amount * 100
      : 0
    const expensesChange = previousExpenses._sum.amount
      ? ((operationalExpenses._sum.amount || 0) - previousExpenses._sum.amount) / previousExpenses._sum.amount * 100
      : 0

    const pipelineCurrentValue = pipelineValue._sum.value || 0
    const pipelinePreviousValue = previousPipeline._sum.value || 0
    const pipelineChange = pipelinePreviousValue
      ? ((pipelineCurrentValue - pipelinePreviousValue) / pipelinePreviousValue) * 100
      : 0

    const clientsGrowth = previousNewClients
      ? ((currentNewClients - previousNewClients) / previousNewClients) * 100
      : currentNewClients > 0
      ? 100
      : 0

    const monthlyMap = new Map<string, { month: string; incomes: number; expenses: number }>()

    for (const income of incomeRows) {
      const key = `${income.date.getFullYear()}-${String(income.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: key, incomes: 0, expenses: 0 })
      }

      if (income.status === 'PAID') {
        monthlyMap.get(key)!.incomes += income.amount
      }
    }

    for (const expense of expenseRows) {
      const key = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: key, incomes: 0, expenses: 0 })
      }

      if (expense.status !== 'CANCELLED') {
        monthlyMap.get(key)!.expenses += expense.amount
      }
    }

    const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    const companySalesCurrentMap = new Map(
      companySalesCurrent.map((row) => [row.companyId, row._sum.amount || 0])
    )
    const companySalesPreviousMap = new Map(
      companySalesPrevious.map((row) => [row.companyId, row._sum.amount || 0])
    )

    const performanceByCompany = companyMeta.map((company) => {
      const sales = companySalesCurrentMap.get(company.id) || 0
      const previousSalesValue = companySalesPreviousMap.get(company.id) || 0
      const growth = previousSalesValue
        ? ((sales - previousSalesValue) / previousSalesValue) * 100
        : sales > 0
        ? 100
        : 0

      return {
        company: company.name,
        industry: company.industry || 'Sin industria',
        sales,
        growth,
        status: growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral',
      }
    })

    const ticketResolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0
    const mktBudget = marketingMetrics._sum.budget || 0
    const mktSpent = marketingMetrics._sum.spent || 0
    const mktRoi = mktSpent > 0 ? ((totalSales._sum.amount || 0) / mktSpent) : 0

    return successResponse({
      kpis: {
        totalSales: totalSales._sum.amount || 0,
        salesGrowth,
        operationalExpenses: operationalExpenses._sum.amount || 0,
        expensesChange,
        pipelineValue: pipelineCurrentValue,
        pipelineChange,
        activeClients,
        clientsGrowth,
        newClientsThisPeriod: currentNewClients,
        ticketResolutionRate,
        activeContracts,
        marketingBudget: mktBudget,
        marketingSpent: mktSpent,
        marketingRoi: mktRoi,
        wonValue: wonOpportunities._sum.value || 0,
        wonCount: wonOpportunities._count.id || 0,
        lostCount: lostOpportunities,
      },
      monthlyData,
      performanceByCompany,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return errorResponse('Error al obtener el resumen del dashboard', 500)
  }
}
