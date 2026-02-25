import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

/**
 * POST: Create Google Calendar event from activity
 */
export async function POST(request: NextRequest) {
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
    const { activityId, createMeetLink } = body

    if (!activityId) {
      return errorResponse('ID de actividad requerido', 400)
    }

    // Get user's Google tokens
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    })

    if (!user?.googleAccessToken) {
      return errorResponse('Google Calendar no está conectado. Por favor autoriza primero.', 403)
    }

    // Get activity details
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        client: { select: { name: true, email: true } },
      },
    })

    if (!activity) {
      return errorResponse('Actividad no encontrada', 404)
    }

    if (!activity.dueDate) {
      return errorResponse('La actividad debe tener una fecha para crear evento de calendario', 400)
    }

    // Calculate end time (1 hour after start by default)
    const startDateTime = new Date(activity.dueDate)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    // Prepare attendees
    const attendees: string[] = []
    if (activity.client?.email) {
      attendees.push(activity.client.email)
    }
    if (activity.assignedTo) {
      // Get assigned user email
      const assignedUser = await prisma.user.findFirst({
        where: { name: activity.assignedTo },
        select: { email: true },
      })
      if (assignedUser?.email) {
        attendees.push(assignedUser.email)
      }
    }

    // Create calendar event
    const result = await createCalendarEvent(
      user.googleAccessToken,
      user.googleRefreshToken || undefined,
      {
        summary: activity.title,
        description: activity.description || undefined,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendees: attendees.length > 0 ? attendees : undefined,
        conferenceData: createMeetLink || false,
      }
    )

    // Save Google Calendar event ID to activity
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        googleEventId: result.eventId,
        googleMeetLink: result.meetLink || null,
      },
    })

    return successResponse({
      message: 'Evento creado en Google Calendar',
      eventLink: result.htmlLink,
      meetLink: result.meetLink,
    })
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    
    if (error.message?.includes('Token expired')) {
      return errorResponse('Tu sesión de Google Calendar ha expirado. Por favor vuelve a autorizar.', 401)
    }

    return errorResponse('Error al crear evento en Google Calendar', 500)
  }
}

/**
 * PUT: Update Google Calendar event
 */
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
    const { activityId } = body

    if (!activityId) {
      return errorResponse('ID de actividad requerido', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    })

    if (!user?.googleAccessToken) {
      return errorResponse('Google Calendar no está conectado', 403)
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    })

    if (!activity || !activity.googleEventId) {
      return errorResponse('Actividad no tiene evento de Google Calendar asociado', 404)
    }

    if (!activity.dueDate) {
      return errorResponse('La actividad debe tener una fecha', 400)
    }

    const startDateTime = new Date(activity.dueDate)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    const result = await updateCalendarEvent(
      user.googleAccessToken,
      user.googleRefreshToken || undefined,
      activity.googleEventId,
      {
        summary: activity.title,
        description: activity.description || undefined,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      }
    )

    return successResponse({
      message: 'Evento actualizado en Google Calendar',
      eventLink: result.htmlLink,
    })
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return errorResponse('Error al actualizar evento en Google Calendar', 500)
  }
}

/**
 * DELETE: Delete Google Calendar event
 */
export async function DELETE(request: NextRequest) {
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
    const activityId = searchParams.get('activityId')

    if (!activityId) {
      return errorResponse('ID de actividad requerido', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    })

    if (!user?.googleAccessToken) {
      return errorResponse('Google Calendar no está conectado', 403)
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    })

    if (!activity || !activity.googleEventId) {
      return errorResponse('Actividad no tiene evento de Google Calendar asociado', 404)
    }

    await deleteCalendarEvent(
      user.googleAccessToken,
      user.googleRefreshToken || undefined,
      activity.googleEventId
    )

    // Remove Google event ID from activity
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        googleEventId: null,
        googleMeetLink: null,
      },
    })

    return successResponse({ message: 'Evento eliminado de Google Calendar' })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return errorResponse('Error al eliminar evento de Google Calendar', 500)
  }
}
