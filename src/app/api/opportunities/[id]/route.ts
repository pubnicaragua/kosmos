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
    const opportunity = await prisma.opportunity.findUnique({ where: { id: params.id } })
    if (!opportunity) return apiError('Oportunidad no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: opportunity.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.opportunity.update({
      where: { id: params.id },
      data: {
        ...body,
        closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return apiError('Error al actualizar oportunidad', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const opportunity = await prisma.opportunity.findUnique({ where: { id: params.id } })
    if (!opportunity) return apiError('Oportunidad no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: opportunity.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.opportunity.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Oportunidad eliminada' })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return apiError('Error al eliminar oportunidad', 500)
  }
}
