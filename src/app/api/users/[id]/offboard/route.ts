import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-response'
import { deactivateUserInTransaction } from '@/lib/user-lifecycle'

export const dynamic = 'force-dynamic'

async function hasGlobalOffboardingPermission(userId: string) {
  return prisma.userCompany.findFirst({
    where: {
      userId,
      role: 'SUPER_ADMIN',
      endedAt: null,
      user: { is: { isActive: true } },
    },
    select: { id: true },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido o usuario inactivo', 401)
    if (!(await hasGlobalOffboardingPermission(decoded.userId))) {
      return apiError('Solo SUPER_ADMIN puede desactivar cuentas globalmente', 403)
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true,
        deactivatedAt: true,
        userCompanies: {
          include: { company: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!target) return apiError('Usuario no encontrado', 404)

    return apiSuccess({
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        avatar: target.avatar,
        isActive: target.isActive,
        deactivatedAt: target.deactivatedAt,
      },
      companies: target.userCompanies.map((membership) => ({
        id: membership.company.id,
        name: membership.company.name,
        role: membership.role,
        active: membership.endedAt === null,
      })),
    })
  } catch (error: any) {
    console.error('Error loading global user deactivation preview:', error?.message)
    return apiError('Error al revisar la desactivación global', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido o usuario inactivo', 401)
    if (decoded.userId === params.id) return apiError('No puedes desactivar tu propio usuario', 400)

    const result = await prisma.$transaction((tx) => deactivateUserInTransaction(tx, {
      actorUserId: decoded.userId,
      targetUserId: params.id,
      deactivatedAt: new Date(),
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return apiSuccess({
      message: 'Usuario desactivado globalmente. Correo, registros y relaciones se conservaron.',
      userId: params.id,
      companies: result.companies,
    })
  } catch (error: any) {
    if (error?.message === 'GLOBAL_PERMISSION_REQUIRED') {
      return apiError('Solo SUPER_ADMIN puede desactivar cuentas globalmente', 403)
    }
    if (error?.message === 'SELF_DEACTIVATION') {
      return apiError('No puedes desactivar tu propio usuario', 400)
    }
    if (error?.message === 'USER_NOT_FOUND') return apiError('Usuario no encontrado', 404)
    if (error?.message === 'USER_ALREADY_INACTIVE') return apiError('El usuario ya está desactivado', 409)
    if (error?.message === 'LAST_SUPER_ADMIN') {
      return apiError('No puedes desactivar al último SUPER_ADMIN activo', 409)
    }
    if (error?.code === 'P2034') {
      return apiError('Cambios simultáneos detectados; vuelve a revisar y confirmar la desactivación', 409)
    }
    console.error('Error executing global user deactivation:', error?.message)
    return apiError('Error al desactivar el usuario', 500)
  }
}
