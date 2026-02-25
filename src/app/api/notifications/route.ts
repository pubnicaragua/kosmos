import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { markAllAsRead } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const notifications = await prisma.notification.findMany({
      where: {
        userId: payload.userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        userId: payload.userId,
        isRead: false,
      },
    })

    return successResponse({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return errorResponse('Error al obtener notificaciones', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await markAllAsRead(payload.userId)
      return successResponse({ message: 'Todas las notificaciones marcadas como leídas' })
    }

    if (notificationId) {
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: payload.userId,
        },
        data: { isRead: true },
      })
      return successResponse({ message: 'Notificación marcada como leída' })
    }

    return errorResponse('Parámetros inválidos', 400)
  } catch (error) {
    console.error('Update notification error:', error)
    return errorResponse('Error al actualizar notificación', 500)
  }
}
