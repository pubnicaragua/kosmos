import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const actor = await verifyToken(token)
    if (!actor) return apiError('Token inválido o usuario inactivo', 401)

    const globalAdminMembership = await prisma.userCompany.findFirst({
      where: {
        userId: actor.userId,
        role: 'SUPER_ADMIN',
        endedAt: null,
        user: { is: { isActive: true } },
      },
      select: { id: true },
    })
    if (!globalAdminMembership) {
      return apiError('Solo SUPER_ADMIN activo puede consultar cuentas inactivas', 403)
    }

    const query = new URL(request.url).searchParams.get('q')?.trim() || ''
    const where: Prisma.UserWhereInput = {
      isActive: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { deactivatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        deactivatedAt: true,
      },
    })

    return apiSuccess(users)
  } catch (error: any) {
    console.error('Error fetching inactive users:', error?.message)
    return apiError('Error al obtener cuentas inactivas', 500)
  }
}
