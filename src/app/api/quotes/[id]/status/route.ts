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
    const { status } = body

    if (!['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'].includes(status)) {
      return apiError('Estado inválido', 400)
    }

    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: quote.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: { status },
      include: {
        client: { select: { name: true } },
        items: true,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating quote status:', error)
    return apiError('Error al actualizar estado', 500)
  }
}
