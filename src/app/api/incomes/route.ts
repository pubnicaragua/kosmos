import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

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
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: payload.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map(uc => uc.companyId)

    if (companyId && !companyIds.includes(companyId)) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const whereClause: any = {
      companyId: companyId ? companyId : { in: companyIds },
    }

    if (status) {
      whereClause.status = status
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    const skip = (page - 1) * limit

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where: whereClause,
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.income.count({ where: whereClause }),
    ])

    return successResponse({
      data: incomes.map(income => ({
        id: income.id,
        company: income.company.name,
        companyId: income.companyId,
        refNumber: income.refNumber,
        client: income.client,
        concept: income.concept,
        method: income.method,
        amount: income.amount,
        margin: income.margin,
        status: income.status,
        date: income.date,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get incomes error:', error)
    return errorResponse('Error al obtener los ingresos', 500)
  }
}
