import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

async function hasGlobalOffboardingPermission(userId: string) {
  return prisma.userCompany.findFirst({
    where: { userId, role: 'SUPER_ADMIN', endedAt: null },
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
      return apiError('Solo SUPER_ADMIN puede dar de baja global', 403)
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        userCompanies: {
          include: { company: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!target) return apiError('Usuario no encontrado', 404)

    return apiSuccess({
      user: { id: target.id, email: target.email, name: target.name, avatar: target.avatar },
      companies: target.userCompanies.map((membership) => ({
        id: membership.company.id,
        name: membership.company.name,
        role: membership.role,
        active: membership.endedAt === null,
      })),
    })
  } catch (error: any) {
    console.error('Error loading global user offboarding preview:', error?.message)
    return apiError('Error al revisar la baja global', 500)
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
    if (decoded.userId === params.id) return apiError('No puedes dar de baja tu propio usuario', 400)
    if (!(await hasGlobalOffboardingPermission(decoded.userId))) {
      return apiError('Solo SUPER_ADMIN puede dar de baja global', 403)
    }

    const archivedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const actorRole = await tx.userCompany.findFirst({
        where: { userId: decoded.userId, role: 'SUPER_ADMIN', endedAt: null },
        select: { id: true },
      })
      if (!actorRole) throw new Error('GLOBAL_PERMISSION_REQUIRED')

      const target = await tx.user.findUnique({
        where: { id: params.id },
        include: {
          userCompanies: {
            where: { endedAt: null },
            include: { company: { select: { id: true, name: true } } },
          },
        },
      })
      if (!target) throw new Error('USER_NOT_FOUND')

      const targetIsSuperAdmin = target.userCompanies.some((membership) => membership.role === 'SUPER_ADMIN')
      if (targetIsSuperAdmin) {
        const otherSuperAdmins = await tx.userCompany.count({
          where: {
            role: 'SUPER_ADMIN',
            endedAt: null,
            userId: { notIn: [target.id] },
          },
        })
        if (otherSuperAdmins === 0) throw new Error('LAST_SUPER_ADMIN')
      }

      await tx.archivedUser.create({
        data: {
          id: target.id,
          email: target.email,
          name: target.name,
          avatar: target.avatar,
          userCreatedAt: target.createdAt,
          userUpdatedAt: target.updatedAt,
          archivedAt,
          archivedById: decoded.userId,
        },
      })

      await tx.userCompany.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.userCompany.updateMany({
        where: { userId: target.id, endedAt: null },
        data: { endedAt: archivedAt },
      })

      await tx.refreshToken.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: archivedAt },
      })

      await tx.quote.updateMany({
        where: { createdBy: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.ticketComment.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.ticketMember.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.notification.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.template.updateMany({
        where: { createdBy: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.userDepartment.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })
      await tx.userDepartment.updateMany({
        where: { userId: target.id, endedAt: null },
        data: { endedAt: archivedAt },
      })
      await tx.userPreferences.updateMany({
        where: { userId: target.id },
        data: { archivedUserId: target.id },
      })

      await tx.user.delete({ where: { id: target.id } })

      return target.userCompanies.map((membership) => ({
        id: membership.company.id,
        name: membership.company.name,
        role: membership.role,
      }))
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return apiSuccess({
      message: 'Usuario dado de baja global; correo liberado y registros históricos conservados',
      archivedUserId: params.id,
      companies: result,
    })
  } catch (error: any) {
    if (error?.message === 'GLOBAL_PERMISSION_REQUIRED') {
      return apiError('Solo SUPER_ADMIN puede dar de baja global', 403)
    }
    if (error?.message === 'USER_NOT_FOUND') return apiError('Usuario no encontrado', 404)
    if (error?.message === 'LAST_SUPER_ADMIN') {
      return apiError('No puedes dar de baja al último SUPER_ADMIN activo', 409)
    }
    if (error?.code === 'P2034') {
      return apiError('Cambios simultáneos detectados; vuelve a revisar y confirmar la baja', 409)
    }
    console.error('Error executing global user offboarding:', error?.message)
    return apiError('Error al ejecutar la baja global', 500)
  }
}
