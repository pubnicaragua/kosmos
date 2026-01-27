import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const contract = await prisma.contract.findUnique({ where: { id: params.id } })
    if (!contract) return apiError('Contrato no encontrado', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: contract.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.contract.update({
      where: { id: params.id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating contract:', error)
    return apiError('Error al actualizar contrato', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const contract = await prisma.contract.findUnique({ where: { id: params.id } })
    if (!contract) return apiError('Contrato no encontrado', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: contract.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.contract.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Contrato eliminado' })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return apiError('Error al eliminar contrato', 500)
  }
}
