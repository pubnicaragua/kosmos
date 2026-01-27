import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { ticketSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (status) where.status = status

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { name: true } },
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
    const validatedData = ticketSchema.parse(body)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

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
  } catch (error) {
    console.error('Error creating ticket:', error)
    return apiError('Error al crear ticket', 500)
  }
}
