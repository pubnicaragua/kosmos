import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === '') {
      return apiError('El contenido del item es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const maxPosition = await prisma.ticketChecklistItem.findFirst({
      where: { checklistId: params.checklistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const item = await prisma.ticketChecklistItem.create({
      data: {
        checklistId: params.checklistId,
        content: content.trim(),
        position: (maxPosition?.position || 0) + 1,
      },
    })

    return apiSuccess(item, undefined, 201)
  } catch (error: any) {
    console.error('Error creating checklist item:', error)
    return apiError('Error al crear item', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { itemId, content, isCompleted } = body

    if (!itemId) {
      return apiError('El ID del item es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const updateData: any = {}
    if (content !== undefined) updateData.content = content
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      if (isCompleted) {
        updateData.completedBy = decoded.userId
        updateData.completedAt = new Date()
      } else {
        updateData.completedBy = null
        updateData.completedAt = null
      }
    }

    const item = await prisma.ticketChecklistItem.update({
      where: { id: itemId },
      data: updateData,
    })

    return apiSuccess(item)
  } catch (error: any) {
    console.error('Error updating checklist item:', error)
    return apiError('Error al actualizar item', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; checklistId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return apiError('El ID del item es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    await prisma.ticketChecklistItem.delete({
      where: { id: itemId },
    })

    return apiSuccess({ message: 'Item eliminado' })
  } catch (error: any) {
    console.error('Error deleting checklist item:', error)
    return apiError('Error al eliminar item', 500)
  }
}
