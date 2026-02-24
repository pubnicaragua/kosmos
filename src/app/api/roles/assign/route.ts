import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { userId, companyId, customRoleId } = body

    if (!userId || !companyId) return apiError('userId y companyId son requeridos', 400)

    const callerCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId },
    })
    if (!callerCompany || !['SUPER_ADMIN', 'ADMIN'].includes(callerCompany.role))
      return apiError('Solo admins pueden asignar roles', 403)

    if (customRoleId) {
      const role = await prisma.customRole.findFirst({
        where: { id: customRoleId, companyId },
      })
      if (!role) return apiError('Rol no pertenece a esta empresa', 400)
    }

    const updated = await prisma.userCompany.update({
      where: { userId_companyId: { userId, companyId } },
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
