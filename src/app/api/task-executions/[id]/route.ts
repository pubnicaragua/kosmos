import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const body = await req.json()
    const { completed, evidencePhotoUrl, evidenceVideoUrl, notes, latitude, longitude } = body

    const execution = await prisma.taskExecution.findUnique({
      where: { id: params.id },
      include: {
        assignment: true,
        template: true
      }
    })

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Ejecución no encontrada' }, { status: 404 })
    }

    // Verify user is assigned or has permission
    if (execution.assignment.assignedTo !== decoded.userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para completar esta tarea' }, { status: 403 })
    }

    // Validate evidence if required
    if (completed && execution.template.requirePhoto && !evidencePhotoUrl) {
      return NextResponse.json({ success: false, error: 'Se requiere evidencia fotográfica' }, { status: 400 })
    }
    if (completed && execution.template.requireVideo && !evidenceVideoUrl) {
      return NextResponse.json({ success: false, error: 'Se requiere evidencia en video' }, { status: 400 })
    }

    const updateData: any = {
      completed,
      notes,
      latitude,
      longitude
    }

    if (completed) {
      updateData.completedAt = new Date()
      updateData.completedBy = decoded.userId
    }
    if (evidencePhotoUrl) updateData.evidencePhotoUrl = evidencePhotoUrl
    if (evidenceVideoUrl) updateData.evidenceVideoUrl = evidenceVideoUrl

    const updated = await prisma.taskExecution.update({
      where: { id: params.id },
      data: updateData
    })

    // Check if all executions are completed to update assignment status
    const allExecutions = await prisma.taskExecution.findMany({
      where: { assignmentId: execution.assignmentId }
    })
    const allCompleted = allExecutions.every(e => e.completed)

    if (allCompleted) {
      await prisma.taskAssignment.update({
        where: { id: execution.assignmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

      // Notify assigner
      await prisma.taskNotification.create({
        data: {
          userId: execution.assignment.assignedBy,
          assignmentId: execution.assignmentId,
          title: 'Tarea completada',
          message: `La tarea ha sido completada por el colaborador`,
          type: 'TASK_COMPLETED'
        }
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating execution:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
