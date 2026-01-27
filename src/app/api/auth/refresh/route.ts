import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { refreshTokenSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = refreshTokenSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400)
    }

    const { refreshToken: token } = validation.data

    const payload = verifyRefreshToken(token)
    if (!payload) {
      return errorResponse('Token de refresco inválido o expirado', 401)
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return errorResponse('Token de refresco inválido o expirado', 401)
    }

    await prisma.refreshToken.delete({
      where: { token },
    })

    const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email })
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email })

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    })

    return successResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return errorResponse('Error al refrescar el token', 500)
  }
}
