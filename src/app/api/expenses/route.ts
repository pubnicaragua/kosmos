import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { expensesFiltersSchema } from '@/lib/validations'

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
    const filters = {
      companyId: searchParams.get('companyId') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    }

    const page = parseInt(filters.page)
    const limit = parseInt(filters.limit)
    const skip = (page - 1) * limit

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)

    const where: any = {
      companyId: filters.companyId || { in: companyIds },
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) where.date.gte = new Date(filters.startDate)
      if (filters.endDate) where.date.lte = new Date(filters.endDate)
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          company: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    const formattedExpenses = expenses.map((expense: any) => ({
      id: expense.id,
      company: expense.company.name,
      date: expense.date.toISOString(),
      refNumber: expense.refNumber || 'N/A',
      provider: expense.provider,
      concept: expense.concept,
      category: expense.category,
      method: expense.method,
      amount: expense.amount,
      status: expense.status,
    }))

    return apiSuccess({
      data: formattedExpenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return apiError('Error al obtener gastos', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const body = await request.json()
    const { companyId, ...expenseData } = body

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: companyId,
      },
    })

    if (!userCompany) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const expense = await prisma.expense.create({
      data: {
        ...expenseData,
        companyId,
        date: new Date(expenseData.date),
      },
    })

    return apiSuccess(expense, 201)
  } catch (error) {
    console.error('Error creating expense:', error)
    return apiError('Error al crear gasto', 500)
  }
}
