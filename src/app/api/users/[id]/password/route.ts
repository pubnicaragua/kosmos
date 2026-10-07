import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { canChangeMemberPassword } from '@/lib/user-management-permissions'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const body = await request.json()
    const { password, companyId } = body

    if (!password || typeof password !== 'string' || password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400)
    }
    if (typeof companyId !== 'string' || !companyId) {
      return errorResponse('companyId es requerido', 400)
    }

    const currentAdminMembership = await prisma.userCompany.findFirst({
      where: {
        userId: payload.userId,
        companyId,
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        endedAt: null,
        user: { is: { isActive: true } },
      },
      select: { companyId: true, role: true },
    })

    if (!currentAdminMembership) {
      return errorResponse('Solo administradores activos de la empresa pueden cambiar contraseñas', 403)
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await prisma.$transaction(async (tx) => {
      const adminMembership = await tx.userCompany.findFirst({
        where: {
          userId: payload.userId,
          companyId,
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          endedAt: null,
          user: { is: { isActive: true } },
        },
        select: { companyId: true, role: true },
      })

      if (!adminMembership) return { kind: 'forbidden' as const }

      const targetMembership = await tx.userCompany.findFirst({
        where: {
          userId: params.id,
          companyId,
          endedAt: null,
          user: { is: { isActive: true } },
        },
        select: { companyId: true, endedAt: true, role: true },
      })

      if (!canChangeMemberPassword({
        actorRole: adminMembership.role,
        actorCompanyId: adminMembership.companyId,
        targetCompanyId: targetMembership?.companyId ?? '',
        targetMembershipActive: targetMembership?.endedAt === null,
        targetRole: targetMembership?.role ?? '',
      })) {
        return { kind: 'not-found' as const }
      }

      await tx.user.update({
        where: { id: params.id },
        data: { password: hashedPassword },
      })

      return { kind: 'updated' as const }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.kind === 'forbidden') {
      return errorResponse('Solo administradores activos de la empresa pueden cambiar contraseñas', 403)
    }
    if (result.kind === 'not-found') {
      return errorResponse('Usuario no encontrado en la empresa activa', 404)
    }

    return successResponse({ message: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Update password error:', error)
    return errorResponse('Error al actualizar la contraseña', 500)
  }
}
