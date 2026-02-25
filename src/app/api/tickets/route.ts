import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { ticketSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId || { in: companyIds }
    if (status) where.status = status
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

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return apiError('Error al obtener tickets', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const normalizedBody = {
      ...body,
      description: body.description ?? undefined,
      clientId: body.clientId ?? undefined,
      assignedTo: body.assignedTo ?? undefined,
      amount: body.amount ?? undefined,
      dueDate: body.dueDate ?? undefined,
    }
    const parsed = ticketSchema.safeParse(normalizedBody)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Datos inválidos para el ticket', 400)
    }
    const validatedData = parsed.data

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const ticket = await prisma.ticket.create({
      data: {
        ...validatedData,
        createdBy: decoded.userId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      },
      include: {
        client: { select: { name: true } },
      },
    })

    return apiSuccess(ticket, undefined, 201)
  } catch (error: any) {
    console.error('Error creating ticket:', error)
    return apiError('Error al crear ticket', 500)
  }
}
