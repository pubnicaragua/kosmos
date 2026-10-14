import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getCompanyAccess } from '@/lib/company-access'
import { resolveHistoricalUserNames } from '@/lib/user-name-history'
import { HISTORICAL_USER_NAME_UNAVAILABLE } from '@/lib/user-identity-history'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: params.id },
      include: {
        taskList: {
          include: {
            templates: {
              orderBy: { order: 'asc' }
            }
          }
        },
        executions: {
          include: {
            template: true
          },
          orderBy: {
            template: {
              order: 'asc'
            }
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Asignación no encontrada' }, { status: 404 })
    }

    const access = await getCompanyAccess(decoded.userId, assignment.companyId)
    if (!access.canAccess) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // Get user names
    const [assignedUser, assignedToNames, assignedByNames, executionNames] = await Promise.all([
      prisma.user.findUnique({ where: { id: assignment.assignedTo }, select: { id: true, name: true } }),
      resolveHistoricalUserNames([{
        userId: assignment.assignedTo,
        occurredAt: assignment.createdAt,
      }]),
      resolveHistoricalUserNames([{
        userId: assignment.assignedBy,
        occurredAt: assignment.createdAt,
      }]),
      resolveHistoricalUserNames(assignment.executions.map((execution) => ({
        userId: execution.completedBy,
        occurredAt: execution.completedAt,
      }))),
    ])
    const executions = assignment.executions.map((execution, index) => ({
      ...execution,
      completedByName: executionNames[index] || null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...assignment,
        executions,
        assignedToName: assignedToNames[0] && assignedToNames[0] !== HISTORICAL_USER_NAME_UNAVAILABLE
          ? assignedToNames[0]
          : assignedUser?.name || 'Usuario desconocido',
        assignedByName: assignedByNames[0] || 'Usuario desconocido',
        progress: assignment.executions.length > 0
          ? (assignment.executions.filter(e => e.completed).length / assignment.executions.length) * 100
          : 0
      }
    })
  } catch (error) {
    console.error('Error fetching assignment:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const body = await req.json()
    const { status, notes } = body

    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: params.id }
    })

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Asignación no encontrada' }, { status: 404 })
    }

    const access = await getCompanyAccess(decoded.userId, assignment.companyId)
    if (!access.canAccess) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'IN_PROGRESS' && !assignment.startedAt) {
        updateData.startedAt = new Date()
      }
      if (status === 'COMPLETED' && !assignment.completedAt) {
        updateData.completedAt = new Date()
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const updated = await prisma.taskAssignment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        taskList: true,
        executions: true
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
