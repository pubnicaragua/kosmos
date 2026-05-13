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

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const document = await prisma.document.findUnique({ where: { id: params.id } })
    if (!document) return apiError('Documento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, document.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await (prisma.document as any).update({
      where: { id: params.id },
      data: {
        name: body.name,
        type: body.type,
        concept: body.concept,
        category: body.category || body.area,
        fileUrl: body.fileUrl,
        ...(body.area !== undefined ? { area: body.area } : {}),
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
        ...(body.sharedWith !== undefined ? { sharedWith: JSON.stringify(body.sharedWith) } : {}),
      },
      include: { company: { select: { name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating document:', error)
    return apiError('Error al actualizar documento', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const document = await prisma.document.findUnique({ where: { id: params.id } })
    if (!document) return apiError('Documento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, document.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.document.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Documento eliminado' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return apiError('Error al eliminar documento', 500)
  }
}
