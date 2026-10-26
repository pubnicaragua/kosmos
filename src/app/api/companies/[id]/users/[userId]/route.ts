import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-response'
import { changeUserNameInTransaction } from '@/lib/user-name-history'
import { isAllowedToRenameUser } from '@/lib/user-identity-history'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const actor = await verifyToken(token)
    if (!actor) return apiError('Token inválido', 401)

    const body = await request.json()
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return apiError('El nombre es requerido', 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const [actorMembership, targetMembership] = await Promise.all([
        tx.userCompany.findUnique({
          where: { userId_companyId: { userId: actor.userId, companyId: params.id } },
          select: { role: true, endedAt: true },
        }),
        tx.userCompany.findUnique({
          where: { userId_companyId: { userId: params.userId, companyId: params.id } },
          select: { userId: true, endedAt: true, user: { select: { isActive: true } } },
        }),
      ])

      if (!isAllowedToRenameUser(
        actorMembership?.endedAt === null ? actorMembership.role : null,
        Boolean(targetMembership && targetMembership.endedAt === null && targetMembership.user.isActive)
      )) {
        if (actorMembership?.role !== 'SUPER_ADMIN') throw new Error('RENAME_FORBIDDEN')
        throw new Error('TARGET_NOT_IN_COMPANY')
      }

      return changeUserNameInTransaction(tx, {
        userId: params.userId,
        name: body.name,
        changedById: actor.userId,
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return apiSuccess({ id: result.id, name: result.name, changed: result.changed })
  } catch (error: any) {
    if (error?.message === 'RENAME_FORBIDDEN') return apiError('Solo ADMIN o SUPER_ADMIN de esta empresa puede cambiar el nombre', 403)
    if (error?.message === 'TARGET_NOT_IN_COMPANY') return apiError('El usuario no pertenece a esta empresa', 404)
    if (error?.message === 'USER_NOT_FOUND') return apiError('Usuario no encontrado', 404)
    if (error?.message === 'USER_INACTIVE') return apiError('La cuenta está desactivada', 409)
    if (error?.message === 'USER_NAME_REQUIRED') return apiError('El nombre es requerido', 400)
    if (error?.code === 'P2034') return apiError('Cambio simultáneo detectado; vuelve a intentar', 409)

    console.error('Error updating company user name:', error?.message)
    return apiError('Error al actualizar el nombre del usuario', 500)
  }
}
