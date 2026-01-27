import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: { include: { product: { select: { name: true } } } },
        company: { select: { name: true } },
      },
    })

    if (!quote) return apiError('Cotización no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: quote.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(quote)
  } catch (error) {
    console.error('Error fetching quote:', error)
    return apiError('Error al obtener cotización', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: quote.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: body,
      include: {
        client: { select: { name: true } },
        items: true,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating quote:', error)
    return apiError('Error al actualizar cotización', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: quote.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.quote.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Cotización eliminada' })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return apiError('Error al eliminar cotización', 500)
  }
}
