import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getAuthUrl, getTokensFromCode } from '@/lib/google-calendar'

/**
 * GET: Get Google OAuth authorization URL
 */
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

    const authUrl = getAuthUrl(payload.userId)

    return successResponse({ authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return errorResponse('Error al generar URL de autorización', 500)
  }
}

/**
 * POST: Exchange authorization code for tokens and save
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
    const { code } = body

    if (!code) {
      return errorResponse('Código de autorización requerido', 400)
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    // Save tokens to user (you'll need to add these fields to User model)
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
      },
    })

    return successResponse({
      message: 'Google Calendar conectado exitosamente',
      hasRefreshToken: !!tokens.refresh_token,
    })
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    return errorResponse('Error al conectar con Google Calendar', 500)
  }
}

/**
 * DELETE: Disconnect Google Calendar
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

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
      },
    })

    return successResponse({ message: 'Google Calendar desconectado' })
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error)
    return errorResponse('Error al desconectar Google Calendar', 500)
  }
}
