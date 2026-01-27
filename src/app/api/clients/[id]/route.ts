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
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return apiError('Cliente no encontrado', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: client.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: body,
      include: { company: { select: { name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating client:', error)
    return apiError('Error al actualizar cliente', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return apiError('Cliente no encontrado', 404)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: client.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.client.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Cliente eliminado' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return apiError('Error al eliminar cliente', 500)
  }
}
