import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { getUserIdentityMap } from '@/lib/user-identity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')

    if (!companyId) return apiError('companyId requerido', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const where: any = { companyId }
    if (assignedTo) where.assignedTo = assignedTo
    if (status) where.status = status

    const assignments = await prisma.taskAssignment.findMany({
      where,
      include: {
        taskList: {
          include: {
            templates: {
              orderBy: { order: 'asc' }
            }
          }
        },
        executions: true
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Get user names for assigned users
    const userIds = [...new Set(assignments.map(a => a.assignedTo))]
    const userMap = await getUserIdentityMap(userIds)

    const enriched = assignments.map(a => ({
      ...a,
      assignedToName: userMap.get(a.assignedTo)?.name || 'Usuario desconocido',
      progress: a.executions.length > 0 
        ? (a.executions.filter(e => e.completed).length / a.executions.length) * 100 
        : 0
    }))

    return apiSuccess(enriched)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return apiError('Error al obtener asignaciones', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, taskListId, assignedTo, dueDate, priority, notes } = body

    if (!companyId || !taskListId || !assignedTo) {
      return apiError('companyId, taskListId y assignedTo son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    // Get task list templates
    const taskList = await prisma.taskList.findUnique({
      where: { id: taskListId },
      include: { templates: true }
    })

    if (!taskList) return apiError('Lista de tareas no encontrada', 404)

    // Create assignment with executions for each template
    const assignment = await prisma.taskAssignment.create({
      data: {
        companyId,
        taskListId,
        assignedTo,
        assignedBy: decoded.userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        notes,
        executions: {
          create: taskList.templates.map(template => ({
            templateId: template.id
          }))
        }
      },
      include: {
        taskList: {
          include: {
            templates: true
          }
        },
        executions: true
      }
    })

    // Create notification for assigned user
    await prisma.taskNotification.create({
      data: {
        userId: assignedTo,
        assignmentId: assignment.id,
        title: 'Nueva tarea asignada',
        message: `Se te ha asignado: ${taskList.name}`,
        type: 'TASK_ASSIGNED'
      }
    })

    // TODO: Send push notification
    await sendPushNotification(assignedTo, {
      title: 'Nueva tarea asignada',
      body: `Se te ha asignado: ${taskList.name}`,
      data: { assignmentId: assignment.id }
    })

    return apiSuccess(assignment, undefined, 201)
  } catch (error: any) {
    console.error('Error creating assignment:', error)
    return apiError('Error al crear asignación', 500)
  }
}

async function sendPushNotification(userId: string, payload: any) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    })

    // Send to all user's devices
    for (const sub of subscriptions) {
      // TODO: Implement web-push or FCM
      console.log('Sending push to:', sub.endpoint, payload)
    }
  } catch (error) {
    console.error('Error sending push:', error)
  }
}
