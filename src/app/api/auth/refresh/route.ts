import { NextRequest } from 'next/server'
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

    if (!storedToken || storedToken.revokedAt || !storedToken.userId || storedToken.expiresAt < new Date()) {
      return errorResponse('Token de refresco inválido o expirado', 401)
    }

    const activeUser = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true },
    })
    if (!activeUser || activeUser.id !== payload.userId) {
      return errorResponse('La cuenta ya no está activa', 401)
    }

    const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email })
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email })
    const rotatedAt = new Date()

    const rotationSucceeded = await prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: storedToken.id, userId: activeUser.id, revokedAt: null },
        data: { revokedAt: rotatedAt },
      })
      if (revoked.count !== 1) return false

      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: activeUser.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      })
      return true
    })
    if (!rotationSucceeded) return errorResponse('Token de refresco inválido o ya utilizado', 401)

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
    return errorResponse('Error al refrescar el token', 500)
  }
}
