import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: decoded.userId },
    })

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: decoded.userId,
        },
      })
    }

    return apiSuccess(preferences)
  } catch (error) {
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

    const preferences = await prisma.userPreferences.upsert({
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
  } catch (error) {
    console.error('Error updating preferences:', error)
    return apiError('Error al actualizar preferencias', 500)
  }
}
