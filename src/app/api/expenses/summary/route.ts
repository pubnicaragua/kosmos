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

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)

    const where: any = {
      companyId: companyId || { in: companyIds },
    }

    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [thisMonthExpenses, lastMonthExpenses, pendingExpenses] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...where,
          date: { gte: firstDayThisMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          date: { gte: firstDayLastMonth, lte: lastDayLastMonth },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          status: 'PENDING',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalExpenses = thisMonthExpenses._sum.amount || 0
    const lastMonthTotal = lastMonthExpenses._sum.amount || 0
    const growth = lastMonthTotal > 0 
      ? ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100 
      : 0

    const paidExpenses = await prisma.expense.aggregate({
      where: {
        ...where,
        status: 'PAID',
        date: { gte: firstDayThisMonth },
      },
      _sum: { amount: true },
    })

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
