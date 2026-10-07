import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  getAccessTokenMaxAgeSeconds,
  getRefreshTokenMaxAgeSeconds,
} from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ACCESS_TOKEN_COOKIE = 'accessToken'
const REFRESH_TOKEN_COOKIE = 'refreshToken'
const REMEMBER_ME_COOKIE = 'rememberMe'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    if (!token) {
      return errorResponse('Token de refresco no encontrado', 401)
    }

    const rememberMe = request.cookies.get(REMEMBER_ME_COOKIE)?.value === 'true'

    const payload = verifyRefreshToken(token)
    if (!payload) {
      return errorResponse('Token de refresco inválido o expirado', 401)
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    })

    const now = new Date()
    if (
      !storedToken ||
      storedToken.userId !== payload.userId ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= now
    ) {
      return errorResponse('Token de refresco inválido o expirado', 401)
    }

    const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email })
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email })

    const rotated = await prisma.$transaction(async (tx) => {
      const activeUser = await tx.user.findFirst({
        where: { id: payload.userId, isActive: true },
        select: { id: true },
      })
      if (!activeUser) return false

      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          userId: payload.userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      })
      if (consumed.count !== 1) return false

      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: payload.userId,
          expiresAt: getRefreshTokenExpiry(),
        },
      })
      return true
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!rotated) return errorResponse('Sesión inválida o cuenta desactivada', 401)

    const response = successResponse({
      accessToken: newAccessToken,
    })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    const accessTokenMaxAge = getAccessTokenMaxAgeSeconds()
    const refreshTokenMaxAge = getRefreshTokenMaxAgeSeconds()

    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
      ...cookieOptions,
      maxAge: accessTokenMaxAge,
    })

    response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: refreshTokenMaxAge } : {}),
    })

    return response
  } catch (error) {
    console.error('Refresh token error:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return errorResponse('Sesión inválida o cuenta desactivada', 401)
    }
    return errorResponse('Error al refrescar el token', 500)
  }
}
