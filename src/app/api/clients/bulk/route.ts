import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { checkDbDuplicateCedulaRuc } from '@/lib/client-validations'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { clients, companyId } = body

    if (!Array.isArray(clients) || clients.length === 0) {
      return apiError('Debe proporcionar un array de clientes', 400)
    }

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId, endedAt: null },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const allDupErrors: string[] = []
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]
      const errs = await checkDbDuplicateCedulaRuc(companyId, {
        cedula: c.cedula,
        ruc: c.ruc,
      })
      if (errs.length > 0) {
        allDupErrors.push(`Fila ${i + 1}: ${errs.map(e => e.message).join(', ')}`)
      }
    }
    if (allDupErrors.length > 0) {
      return apiError(allDupErrors.join('. '), 409)
    }

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
