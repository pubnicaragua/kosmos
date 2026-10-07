import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const companyId = params.id
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return apiError('userId y role son requeridos', 400)
    }

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return apiError('Rol inválido. Debe ser USER, ADMIN o SUPER_ADMIN', 400)
    }

    // Verify requester has permission to change roles
    const updated = await prisma.$transaction(async (tx) => {
      const requesterAccess = await tx.userCompany.findFirst({
        where: {
          userId: decoded.userId,
          companyId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          endedAt: null,
          user: { is: { isActive: true } },
        },
        select: { role: true },
      })

      if (!requesterAccess) throw new Error('ROLE_CHANGE_FORBIDDEN')
      if (role === 'SUPER_ADMIN' && requesterAccess.role !== 'SUPER_ADMIN') {
        throw new Error('SUPER_ADMIN_GRANT_FORBIDDEN')
      }

      const targetMembership = await tx.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId } },
        select: { id: true, role: true, endedAt: true, user: { select: { isActive: true } } },
      })
      if (!targetMembership || targetMembership.endedAt || !targetMembership.user.isActive) {
        throw new Error('ACTIVE_MEMBERSHIP_NOT_FOUND')
      }
      if (targetMembership.role === 'SUPER_ADMIN' && requesterAccess.role !== 'SUPER_ADMIN') {
        throw new Error('SUPER_ADMIN_CHANGE_FORBIDDEN')
      }

      if (targetMembership.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
        const otherActiveSuperAdmins = await tx.userCompany.count({
          where: {
            role: 'SUPER_ADMIN',
            endedAt: null,
            userId: { not: userId },
            user: { is: { isActive: true } },
          },
        })
        if (otherActiveSuperAdmins === 0) throw new Error('LAST_SUPER_ADMIN')
      }

      return tx.userCompany.update({
        where: { id: targetMembership.id },
        data: { role },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return apiSuccess(updated, 'Rol actualizado exitosamente')
  } catch (error: any) {
    if (error?.message === 'ROLE_CHANGE_FORBIDDEN') {
      return apiError('No tienes permisos para cambiar roles en esta empresa', 403)
    }
    if (error?.message === 'SUPER_ADMIN_GRANT_FORBIDDEN' || error?.message === 'SUPER_ADMIN_CHANGE_FORBIDDEN') {
      return apiError('Solo un SUPER_ADMIN puede otorgar o modificar ese rol', 403)
    }
    if (error?.message === 'ACTIVE_MEMBERSHIP_NOT_FOUND') {
      return apiError('El usuario no tiene membresía activa en esta empresa', 404)
    }
    if (error?.message === 'LAST_SUPER_ADMIN') {
      return apiError('No puedes quitar el último SUPER_ADMIN activo', 409)
    }
    if (error?.code === 'P2034') {
      return apiError('Cambios simultáneos detectados; vuelve a intentar', 409)
    }
    console.error('Error updating user role:', error)
    return apiError(`Error al actualizar rol: ${error?.message || error}`, 500)
  }
}
