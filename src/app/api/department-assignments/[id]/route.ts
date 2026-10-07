import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { isAdminRole } from '@/lib/purchase-permissions'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const existing = await prisma.userDepartment.findFirst({
      where: { id: params.id, endedAt: null, user: { is: { isActive: true } } },
      include: { department: { select: { companyId: true } } },
    })
    if (!existing) return apiError('Asignación no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existing.department.companyId)
    if (!access.canAccess || !isAdminRole(access.effectiveRole)) {
      return apiError('Solo admins pueden modificar asignaciones', 403)
    }

    const body = await request.json()
    const data: any = {}
    if ('role' in body) data.role = body.role || null
    if ('isApprover' in body) data.isApprover = Boolean(body.isApprover)
    if ('isReceiver' in body) data.isReceiver = Boolean(body.isReceiver)
    if ('isBuyer' in body) data.isBuyer = Boolean(body.isBuyer)

    const updated = await prisma.userDepartment.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Error updating department assignment:', error?.message)
    return apiError('Error al actualizar asignación', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const existing = await prisma.userDepartment.findFirst({
      where: { id: params.id, endedAt: null, user: { is: { isActive: true } } },
      include: { department: { select: { companyId: true } } },
    })
    if (!existing) return apiError('Asignación no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existing.department.companyId)
    if (!access.canAccess || !isAdminRole(access.effectiveRole)) {
      return apiError('Solo admins pueden eliminar asignaciones', 403)
    }

    const closed = await prisma.userDepartment.updateMany({
      where: { id: params.id, endedAt: null },
      data: { endedAt: new Date() },
    })
    if (closed.count !== 1) return apiError('Asignación no encontrada', 404)
    return apiSuccess({ message: 'Asignación cerrada; el registro histórico se conservó' })
  } catch (error: any) {
    console.error('Error deleting department assignment:', error?.message)
    return apiError('Error al eliminar asignación', 500)
  }
}
