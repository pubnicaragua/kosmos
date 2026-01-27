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
    const { clients, companyId } = body

    if (!Array.isArray(clients) || clients.length === 0) {
      return apiError('Debe proporcionar un array de clientes', 400)
    }

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const created = await prisma.client.createMany({
      data: clients.map((client: any) => ({
        ...client,
        companyId,
      })),
    })

    return apiSuccess({ count: created.count, message: `${created.count} clientes creados` })
  } catch (error) {
    console.error('Error creating bulk clients:', error)
    return apiError('Error al crear clientes', 500)
  }
}
