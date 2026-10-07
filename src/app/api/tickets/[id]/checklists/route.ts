import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const checklists = await prisma.ticketChecklist.findMany({
      where: { ticketId: params.id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    })

    return apiSuccess(checklists)
  } catch (error: any) {
    console.error('Error fetching checklists:', error)
    return apiError('Error al obtener checklists', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { title, items = [] } = body

    if (!title || title.trim() === '') {
      return apiError('El título del checklist es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const maxPosition = await prisma.ticketChecklist.findFirst({
      where: { ticketId: params.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const checklist = await prisma.ticketChecklist.create({
      data: {
        ticketId: params.id,
        title: title.trim(),
        position: (maxPosition?.position || 0) + 1,
        items: {
          create: items.map((item: string, index: number) => ({
            content: item,
            position: index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    })

    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'checklist_created',
        newValue: title,
      },
    })

    return apiSuccess(checklist, undefined, 201)
  } catch (error: any) {
    console.error('Error creating checklist:', error)
    return apiError('Error al crear checklist', 500)
  }
}
