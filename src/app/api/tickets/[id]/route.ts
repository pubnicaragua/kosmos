import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

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
        assignedUsers: body.assignedUsers ? JSON.stringify(body.assignedUsers) : undefined,
        amount: body.amount,
        currency: body.currency,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        attachments: body.attachments ? JSON.stringify(body.attachments) : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    })

    // Notify newly assigned users when assignedTo changes
    if (body.assignedTo && body.assignedTo !== ticket.assignedTo) {
      const prevAssignees = new Set(
        (ticket.assignedTo || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      )
      const newAssignees = body.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const name of newAssignees) {
        if (!prevAssignees.has(name)) {
          const userRecord = await prisma.user.findFirst({ where: { name }, select: { id: true } })
          if (userRecord && userRecord.id !== decoded.userId) {
            await notifyAssignment({
              assignedUserId: userRecord.id,
              assignedByUserId: decoded.userId,
              itemType: 'ticket',
              itemTitle: body.title || ticket.title,
              itemId: ticket.id,
            })
          }
        }
      }
    }

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
