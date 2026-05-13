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

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const subTasks = await prisma.ticketSubTask.findMany({
      where: { ticketId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(subTasks)
  } catch (error: any) {
    console.error('Error fetching sub-tasks:', error)
    return apiError('Error al obtener sub-tareas', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { title, description, assignedTo, status, priority, dueDate } = body

    if (!title || title.trim() === '') {
      return apiError('El título de la sub-tarea es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const subTask = await prisma.ticketSubTask.create({
      data: {
        ticketId: params.id,
        title: title.trim(),
        description: description || null,
        assignedTo: assignedTo || null,
        status: status || 'PENDIENTE',
        priority: priority || 'MEDIA',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: decoded.userId,
      },
    })

    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'subtask_created',
        newValue: title,
        metadata: JSON.stringify({ assignedTo, status, priority }),
      },
    })

    return apiSuccess(subTask, undefined, 201)
  } catch (error: any) {
    console.error('Error creating sub-task:', error)
    return apiError('Error al crear sub-tarea', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { subTaskId, title, description, assignedTo, status, priority, dueDate } = body

    if (!subTaskId) {
      return apiError('El ID de la sub-tarea es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (status !== undefined) {
      updateData.status = status
      if (status === 'COMPLETADO' || status === 'TERMINADO') {
        updateData.completedAt = new Date()
      }
    }
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    const subTask = await prisma.ticketSubTask.update({
      where: { id: subTaskId },
      data: updateData,
    })

    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'subtask_updated',
        field: 'multiple',
        newValue: JSON.stringify(updateData),
      },
    })

    return apiSuccess(subTask)
  } catch (error: any) {
    console.error('Error updating sub-task:', error)
    return apiError('Error al actualizar sub-tarea', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const subTaskId = searchParams.get('subTaskId')

    if (!subTaskId) {
      return apiError('El ID de la sub-tarea es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    await prisma.ticketSubTask.delete({
      where: { id: subTaskId },
    })

    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'subtask_deleted',
        oldValue: subTaskId,
      },
    })

    return apiSuccess({ message: 'Sub-tarea eliminada' })
  } catch (error: any) {
    console.error('Error deleting sub-task:', error)
    return apiError('Error al eliminar sub-tarea', 500)
  }
}
