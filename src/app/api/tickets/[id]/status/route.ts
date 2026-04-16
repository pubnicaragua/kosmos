import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { status } = body

    if (!status) {
      return apiError('Estado no proporcionado', 400)
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: { status },
      include: { client: { select: { name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating ticket status:', error)
    return apiError('Error al actualizar estado', 500)
  }
}
