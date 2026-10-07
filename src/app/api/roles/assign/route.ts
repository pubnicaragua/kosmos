import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { userId, companyId, customRoleId } = body

    if (!userId || !companyId) return apiError('userId y companyId son requeridos', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden asignar roles', 403)

    if (customRoleId) {
      const role = await prisma.customRole.findFirst({
        where: { id: customRoleId, companyId },
      })
      if (!role) return apiError('Rol no pertenece a esta empresa', 400)
    }

    const membership = await prisma.userCompany.findFirst({
      where: { userId, companyId, endedAt: null },
      select: { id: true },
    })
    if (!membership) return apiError('Usuario sin membresía activa en esta empresa', 404)

    const updated = await prisma.userCompany.update({
      where: { id: membership.id },
      data: { customRoleId: customRoleId || null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customRole: { include: { permissions: true } },
      },
    })

    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Error assigning role:', error?.message)
    return apiError('Error al asignar rol', 500)
  }
}
