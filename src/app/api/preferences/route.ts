import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// Verificar si el modelo UserPreferences existe
const hasUserPreferences = 'userPreferences' in prisma

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    // Si el modelo no existe, devolver preferencias vacías
    if (!hasUserPreferences) {
      return apiSuccess({ userId: decoded.userId, ticketColumns: null })
    }

    let preferences = await (prisma as any).userPreferences.findUnique({
      where: { userId: decoded.userId },
    })

    if (!preferences) {
      preferences = await (prisma as any).userPreferences.create({
        data: {
          userId: decoded.userId,
        },
      })
    }

    return apiSuccess(preferences)
  } catch (error: any) {
    // Si la tabla no existe, devolver preferencias vacías
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return apiSuccess({ userId: request.headers.get('x-user-id') || '', ticketColumns: null })
    }
    console.error('Error fetching preferences:', error)
    return apiError('Error al obtener preferencias', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { ticketColumns } = body

    // Si el modelo no existe, devolver éxito sin guardar
    if (!hasUserPreferences) {
      return apiSuccess({ userId: decoded.userId, ticketColumns })
    }

    const preferences = await (prisma as any).userPreferences.upsert({
      where: { userId: decoded.userId },
      update: {
        ticketColumns: ticketColumns ? ticketColumns : Prisma.JsonNull,
      },
      create: {
        userId: decoded.userId,
        ticketColumns: ticketColumns ? ticketColumns : Prisma.JsonNull,
      },
    })

    return apiSuccess(preferences)
  } catch (error: any) {
    // Si la tabla no existe, devolver éxito sin guardar
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return apiSuccess({ userId: '', ticketColumns: null })
    }
    console.error('Error updating preferences:', error)
    return apiError('Error al actualizar preferencias', 500)
  }
}
