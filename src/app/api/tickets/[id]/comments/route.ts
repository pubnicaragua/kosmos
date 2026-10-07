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

    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        archivedUser: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return apiSuccess(comments.map((comment) => ({
      ...comment,
      user: comment.user || comment.archivedUser,
    })))
  } catch (error: any) {
    console.error('Error fetching ticket comments:', error)
    return apiError('Error al obtener comentarios', 500)
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
    const { content, attachmentUrl } = body

    if (!content || content.trim() === '') {
      return apiError('El contenido del comentario es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        content: content.trim(),
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        archivedUser: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    await prisma.ticket.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return apiSuccess({ ...comment, user: comment.user || comment.archivedUser }, undefined, 201)
  } catch (error: any) {
    console.error('Error creating ticket comment:', error)
    return apiError('Error al crear comentario', 500)
  }
}
