import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
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
    const requesterAccess = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      }
    })

    if (!requesterAccess) {
      return apiError('No tienes permisos para cambiar roles en esta empresa', 403)
    }

    // Update user role in company
    const updated = await prisma.userCompany.update({
      where: {
        userId_companyId: {
          userId,
          companyId
        }
      },
      data: {
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return apiSuccess(updated, 'Rol actualizado exitosamente')
  } catch (error: any) {
    console.error('Error updating user role:', error)
    return apiError(`Error al actualizar rol: ${error?.message || error}`, 500)
  }
}
