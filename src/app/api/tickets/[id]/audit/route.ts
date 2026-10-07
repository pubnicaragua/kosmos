import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { getUserIdentityMap } from '@/lib/user-identity'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const auditLogs = await prisma.ticketAuditLog.findMany({
      where: { ticketId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    // Enriquecer con información de usuarios
    const userMap = await getUserIdentityMap(auditLogs.map((log) => log.userId))

    const enrichedLogs = auditLogs.map(log => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }))

    return apiSuccess(enrichedLogs)
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return apiError('Error al obtener historial de auditoría', 500)
  }
}
