import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { resolveHistoricalUserNames } from '@/lib/user-name-history'

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
      orderBy: { createdAt: 'asc' },
    })

    const [activeUsers, historicalNames] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: [...new Set(comments.map((comment) => comment.userId))] } },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      resolveHistoricalUserNames(comments.map((comment) => ({
        userId: comment.userId,
        occurredAt: comment.createdAt,
      }))),
    ])
    const activeUsersById = new Map(activeUsers.map((activeUser) => [activeUser.id, activeUser]))

    return apiSuccess(comments.map((comment, index) => ({
      ...comment,
      user: {
        id: comment.userId,
        name: historicalNames[index] || activeUsersById.get(comment.userId)?.name || 'Usuario desconocido',
        email: activeUsersById.get(comment.userId)?.email || null,
        avatar: activeUsersById.get(comment.userId)?.avatar || null,
      },
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
    })

    const [activeUser, historicalName] = await Promise.all([
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      resolveHistoricalUserNames([{ userId: decoded.userId, occurredAt: comment.createdAt }]),
    ])

    await prisma.ticket.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return apiSuccess({
      ...comment,
      user: activeUser
        ? { ...activeUser, name: historicalName[0] || activeUser.name }
        : {
            id: decoded.userId,
            name: historicalName[0] || 'Usuario desconocido',
            email: null,
            avatar: null,
          },
    }, undefined, 201)
  } catch (error: any) {
    console.error('Error creating ticket comment:', error)
    return apiError('Error al crear comentario', 500)
  }
}
