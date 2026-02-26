import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
    })

    if (!activity) {
      return apiError('Actividad no encontrada', 404)
    }

    const access = await getCompanyAccess(decoded.userId, activity.companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    return apiSuccess(activity)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return apiError('Error al obtener actividad', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
    })

    if (!activity) {
      return apiError('Actividad no encontrada', 404)
    }

    const access = await getCompanyAccess(decoded.userId, activity.companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const updateData: any = { ...body }
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate)
    if (body.status === 'COMPLETED' && !activity.completedAt) {
      updateData.completedAt = new Date()
    }

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: updateData,
    })

    // Notify each newly added assignee (supports comma-separated multi-assignee names)
    if (body.assignedTo && body.assignedTo !== activity.assignedTo) {
      const prevAssignees = new Set(
        (activity.assignedTo || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      )
      const newAssignees = body.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const name of newAssignees) {
        if (!prevAssignees.has(name)) {
          const userRecord = await prisma.user.findFirst({ where: { name }, select: { id: true } })
          if (userRecord && userRecord.id !== decoded.userId) {
            await notifyAssignment({
              assignedUserId: userRecord.id,
              assignedByUserId: decoded.userId,
              itemType: 'activity',
              itemTitle: activity.title,
              itemId: activity.id,
            })
          }
        }
      }
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating activity:', error)
    return apiError('Error al actualizar actividad', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
    })

    if (!activity) {
      return apiError('Actividad no encontrada', 404)
    }

    const access = await getCompanyAccess(decoded.userId, activity.companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    await prisma.activity.delete({
      where: { id: params.id },
    })

    return apiSuccess({ message: 'Actividad eliminada' })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return apiError('Error al eliminar actividad', 500)
  }
}
