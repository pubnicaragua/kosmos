import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const column = await prisma.pipelineColumn.findUnique({
      where: { id: params.id },
    })

    if (!column) return apiError('Columna no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, column.companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || '')) {
      return apiError('Solo administradores pueden eliminar columnas', 403)
    }

    await prisma.pipelineColumn.delete({
      where: { id: params.id },
    })

    return apiSuccess({ message: 'Columna eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting pipeline column:', error)
    return apiError('Error al eliminar columna', 500)
  }
}
