import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const role = await prisma.customRole.findUnique({ where: { id: params.id } })
    if (!role) return apiError('Rol no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, role.companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden editar roles', 403)

    const body = await request.json()
    const { name, description, color, permissions } = body

    const updated = await prisma.customRole.update({
      where: { id: params.id },
      data: {
        name: name ?? role.name,
        description: description !== undefined ? description : role.description,
        color: color ?? role.color,
      },
    })

    if (permissions && Array.isArray(permissions)) {
      await prisma.rolePermission.deleteMany({ where: { customRoleId: params.id } })
      await prisma.rolePermission.createMany({
        data: permissions.map((p: any) => ({
          customRoleId: params.id,
          module: p.module,
          canView: p.canView ?? true,
          canCreate: p.canCreate ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          canExport: p.canExport ?? false,
        })),
      })
    }

    const result = await prisma.customRole.findUnique({
      where: { id: params.id },
      include: {
        permissions: true,
        userCompanies: {
          where: { endedAt: null },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    return apiSuccess(result)
  } catch (error: any) {
    if (error?.code === 'P2002') return apiError('Ya existe un rol con ese nombre', 409)
    console.error('Error updating role:', error?.message)
    return apiError('Error al actualizar rol', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const role = await prisma.customRole.findUnique({ where: { id: params.id } })
    if (!role) return apiError('Rol no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, role.companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden eliminar roles', 403)

    await prisma.userCompany.updateMany({
      where: { customRoleId: params.id },
      data: { customRoleId: null },
    })

    await prisma.customRole.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Rol eliminado' })
  } catch (error: any) {
    console.error('Error deleting role:', error?.message)
    return apiError('Error al eliminar rol', 500)
  }
}
