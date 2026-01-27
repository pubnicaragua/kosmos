import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const document = await prisma.document.findUnique({ where: { id: params.id } })
    if (!document) return apiError('Documento no encontrado', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: document.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.document.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Documento eliminado' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return apiError('Error al eliminar documento', 500)
  }
}
