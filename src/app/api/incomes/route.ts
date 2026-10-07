import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)

    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')

    const { companyIds } = await getAccessibleCompanies(payload.userId)
    const allowedCompanyIds = []

    for (const cid of companyIds) {
      const moduleAccess = await getModuleAccess(payload.userId, cid, 'ingresos')
      if (moduleAccess.canView) {
        allowedCompanyIds.push(cid)
      }
    }

    const whereClause: any = {}

    if (companyId) {
      if (!allowedCompanyIds.includes(companyId)) {
        return errorResponse('No tienes permisos para ver ingresos en esta empresa', 403)
      }
      whereClause.companyId = companyId
    } else {
      if (allowedCompanyIds.length === 0) {
        return errorResponse('No tienes permisos para ver ingresos en ninguna empresa', 403)
      }
      whereClause.companyId = { in: allowedCompanyIds }
    }

    if (status) {
      whereClause.status = status
    }

    if (method) {
      whereClause.method = { contains: method, mode: 'insensitive' }
    }

    // Búsqueda general por cliente, referencia o concepto
    if (search) {
      whereClause.OR = [
        { client: { contains: search, mode: 'insensitive' } },
        { refNumber: { contains: search, mode: 'insensitive' } },
        { concept: { contains: search, mode: 'insensitive' } },
      ]
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticacion requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)

    if (!payload) {
      return errorResponse('Token invalido o expirado', 401)
    }

    const body = await request.json()
    const {
      companyId,
      refNumber,
      client,
      concept,
      method,
      amount,
      margin,
      status,
      date,
    } = body

    if (!companyId || !amount) {
      return errorResponse('Campos requeridos incompletos', 400)
    }

    const access = await getCompanyAccess(payload.userId, companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const moduleAccess = await getModuleAccess(payload.userId, companyId, 'ingresos')
    if (!moduleAccess.canCreate) {
      return errorResponse('No tienes permisos para crear ingresos', 403)
    }

    const normalizedAmount = Number(amount)
    const normalizedMargin = margin === undefined || margin === null || margin === '' ? 0 : Number(margin)
    if (!Number.isFinite(normalizedAmount)) {
      return errorResponse('Monto invalido', 400)
    }

    const income = await prisma.income.create({
      data: {
        companyId,
        refNumber: String(refNumber || `REF-${Date.now()}`),
        client: String(client),
        concept: String(concept),
        method: String(method),
        amount: normalizedAmount,
        margin: Number.isFinite(normalizedMargin) ? normalizedMargin : 0,
        status: status || 'PENDING',
        date: date ? new Date(date) : new Date(),
      },
      include: {
        company: {
          select: { name: true },
        },
      },
    })

    return successResponse(
      {
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
      },
      'Ingreso creado correctamente',
      201
    )
  } catch (error) {
    console.error('Create income error:', error)
    return errorResponse('Error al crear ingreso', 500)
  }
}
