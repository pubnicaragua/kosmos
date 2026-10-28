import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-response'
import { deleteUserInTransaction } from '@/lib/user-lifecycle'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const actor = await verifyToken(token)
    if (!actor) return apiError('Token inválido o usuario inactivo', 401)

    const deletedUser = await prisma.$transaction(
      (tx) => deleteUserInTransaction(tx, {
        actorUserId: actor.userId,
        targetUserId: params.id,
        deletedAt: new Date(),
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    return apiSuccess({
      message: 'Usuario eliminado. El correo quedó libre; sus registros históricos conservan su autoría.',
      userId: deletedUser.id,
      emailReleased: true,
    })
  } catch (error: any) {
    const prismaCode = typeof error?.code === 'string' ? error.code : undefined
    if (error?.message === 'GLOBAL_PERMISSION_REQUIRED') {
      return apiError('Solo un SUPER_ADMIN activo puede eliminar usuarios globalmente', 403)
    }
    if (error?.message === 'SELF_DELETION') {
      return apiError('No puedes eliminar tu propio usuario', 400)
    }
    if (error?.message === 'USER_NOT_FOUND') return apiError('Usuario no encontrado', 404)
    if (error?.message === 'LAST_SUPER_ADMIN') {
      return apiError('No puedes eliminar al último SUPER_ADMIN activo', 409)
    }
    if (error?.code === 'P2034') {
      return apiError('Cambios simultáneos detectados; vuelve a revisar e intentar', 409)
    }
    if (error?.code === 'P2003') {
      return apiError('Una relación aún bloquea la eliminación; no se borró ningún dato', 409)
    }
    if (error?.code === 'P2002') {
      return apiError('La identidad archivada ya existe; no se borró ningún dato', 409)
    }
    if (prismaCode === 'P2021' || prismaCode === 'P2022') {
      console.error('User deletion blocked by unapplied database migration:', {
        code: prismaCode,
        meta: error?.meta,
        message: error?.message,
      })
      return apiError(
        'Faltan migraciones de base de datos necesarias para eliminar cuentas. Aplica las migraciones pendientes y vuelve a intentar.',
        503
      )
    }

    console.error('Error deleting user globally:', {
      code: prismaCode,
      meta: error?.meta,
      message: error?.message,
      stack: error?.stack,
    })
    return apiError('Error al eliminar el usuario', 500)
  }
}
