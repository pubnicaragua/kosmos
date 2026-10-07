import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { resolveHistoricalUserNames } from '@/lib/user-name-history'

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
    const userIds = [...new Set(auditLogs.map(log => log.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatar: true },
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const historicalNames = await resolveHistoricalUserNames(auditLogs.map((log) => ({
      userId: log.userId,
      occurredAt: log.createdAt,
    })))

    const enrichedLogs = auditLogs.map((log, index) => {
      const user = userMap.get(log.userId) || null
      return {
        ...log,
        user: user ? { ...user, name: historicalNames[index] || user.name } : null,
      }
    })

    return apiSuccess(enrichedLogs)
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return apiError('Error al obtener historial de auditoría', 500)
  }
}
