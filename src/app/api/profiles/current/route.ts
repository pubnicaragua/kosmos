import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('UNAUTHORIZED', 'Token inválido o expirado', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'Usuario no encontrado', 404)
    }

    const companies = user.userCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
      logo: uc.company.logo,
      industry: uc.company.industry,
      isActive: uc.company.isActive,
      role: uc.role,
    }))

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      companies,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return errorResponse('SERVER_ERROR', 'Error al obtener el perfil', 500)
  }
}
