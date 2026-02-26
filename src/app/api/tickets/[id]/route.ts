import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return apiError('Error al obtener ticket', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        clientId: body.clientId,
        status: body.status,
        priority: body.priority,
        assignedTo: body.assignedTo,
        amount: body.amount,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: { client: { select: { id: true, name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return apiError('Error al actualizar ticket', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.ticket.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Ticket eliminado' })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return apiError('Error al eliminar ticket', 500)
  }
}
