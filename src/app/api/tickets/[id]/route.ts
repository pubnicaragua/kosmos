import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

const isAdminRole = (role: string | null | undefined) =>
  role === 'SUPER_ADMIN' || role === 'ADMIN'

const parseAssignedUsers = (value?: string | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const isUserAssigned = (
  ticket: { assignedUsers: string | null; assignedTo: string | null },
  userId: string,
  userName?: string | null
) => {
  const assignedUserIds = parseAssignedUsers(ticket.assignedUsers)
  if (assignedUserIds.includes(userId)) return true
  if (!userName) return false
  return (ticket.assignedTo || '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
    .includes(userName.trim().toLowerCase())
}

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

    const isAdmin = isAdminRole(access.effectiveRole)
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    })

    if (!isAdmin && !isUserAssigned(ticket, decoded.userId, currentUser?.name)) {
      return apiError('No tienes acceso a este ticket', 403)
    }

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

    const isAdminForUpdate = isAdminRole(access.effectiveRole)
    const currentUserForUpdate = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    })

    if (!isAdminForUpdate && !isUserAssigned(ticket, decoded.userId, currentUserForUpdate?.name)) {
      return apiError('No tienes acceso a este ticket', 403)
    }

    if (
      !isAdminForUpdate &&
      ticket.createdBy === decoded.userId &&
      (ticket.status === 'ASIGNADO' || ticket.status === 'EN_PROCESO')
    ) {
      return apiError('No puedes editar este ticket en su estado actual', 403)
    }

    const nextAssignedUsers = Array.isArray(body.assignedUsers)
      ? body.assignedUsers
      : parseAssignedUsers(ticket.assignedUsers)
    const prevAssignedUsers = parseAssignedUsers(ticket.assignedUsers)
    const assignedUsersChanged =
      Array.isArray(body.assignedUsers) &&
      (prevAssignedUsers.length !== nextAssignedUsers.length ||
        prevAssignedUsers.some((id) => !nextAssignedUsers.includes(id)))
    const assignedToChanged =
      typeof body.assignedTo !== 'undefined' && body.assignedTo !== ticket.assignedTo

    if ((assignedUsersChanged || assignedToChanged) && ticket.status !== 'NUEVO') {
      return apiError('Solo puedes reasignar tickets en estado NUEVO', 403)
    }

    // Calcular métricas de tiempo
    const now = new Date()
    const updateData: any = {
      title: body.title,
      description: body.description,
      clientId: body.clientId,
      type: body.type,
      status: body.status,
      priority: body.priority,
      assignedTo: body.assignedTo,
      assignedUsers: body.assignedUsers ? JSON.stringify(body.assignedUsers) : undefined,
      branch: body.branch,
      amount: body.amount,
      currency: body.currency,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      attachments: body.attachments ? JSON.stringify(body.attachments) : undefined,
      equipmentType: body.equipmentType,
      equipmentBrand: body.equipmentBrand,
      equipmentModel: body.equipmentModel,
      serialNumber: body.serialNumber,
      installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
      installedBy: body.installedBy,
      evidence: body.evidence ? JSON.stringify(body.evidence) : undefined,
    }

    // Calcular tiempo de respuesta cuando se asigna por primera vez
    if (body.assignedTo && !ticket.assignedTo && !ticket.responseTime) {
      const responseTime = Math.floor((now.getTime() - ticket.createdAt.getTime()) / 60000) // minutos
      updateData.responseTime = responseTime
    }

    // Calcular tiempo de resolución cuando se cierra
    if ((body.status === 'RESUELTO' || body.status === 'CERRADO') && 
        ticket.status !== 'RESUELTO' && ticket.status !== 'CERRADO') {
      const resolutionTime = Math.floor((now.getTime() - ticket.createdAt.getTime()) / 60000) // minutos
      updateData.resolutionTime = resolutionTime
      updateData.closedAt = now
    }

    // Incrementar contador de reaperturas
    if (ticket.status === 'CERRADO' && body.status !== 'CERRADO' && body.status !== 'CANCELADO') {
      updateData.reopenedCount = (ticket.reopenedCount || 0) + 1
    }

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: { client: { select: { id: true, name: true } } },
    })

    // Notify newly assigned users
    const prevAssigneeIds = new Set(
      ticket.assignedUsers ? JSON.parse(ticket.assignedUsers) : []
    )
    const currentAssigneeIds = body.assignedUsers || []
    
    if (Array.isArray(currentAssigneeIds) && currentAssigneeIds.length > 0) {
      for (const userId of currentAssigneeIds) {
        if (!prevAssigneeIds.has(userId) && userId !== decoded.userId) {
          await notifyAssignment({
            assignedUserId: userId,
            assignedByUserId: decoded.userId,
            itemType: 'ticket',
            itemTitle: body.title || ticket.title,
            itemId: ticket.id,
          })
        }
      }
    } else if (body.assignedTo && body.assignedTo !== ticket.assignedTo) {
      // Fallback for names
      const prevNames = new Set(
        (ticket.assignedTo || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      )
      const newNames = body.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const name of newNames) {
        if (!prevNames.has(name)) {
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

    const isAdminForDelete = isAdminRole(access.effectiveRole)
    const currentUserForDelete = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    })

    if (!isAdminForDelete && !isUserAssigned(ticket, decoded.userId, currentUserForDelete?.name)) {
      return apiError('No tienes acceso a este ticket', 403)
    }

    if (
      !isAdminForDelete &&
      ticket.createdBy === decoded.userId &&
      (ticket.status === 'ASIGNADO' || ticket.status === 'EN_PROCESO')
    ) {
      return apiError('No puedes eliminar este ticket en su estado actual', 403)
    }

    await prisma.ticket.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Ticket eliminado' })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return apiError('Error al eliminar ticket', 500)
  }
}
