import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {
      companyId: companyId || { in: companyIds }
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {}
      if (startDateParam) {
        const startDate = new Date(startDateParam)
        startDate.setHours(0, 0, 0, 0)
        where.createdAt.gte = startDate
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    // Obtener todos los tickets para calcular KPIs
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { name: true } },
      }
    })

    // Calcular KPIs
    const totalTickets = tickets.length
    const closedTickets = tickets.filter(t => t.status === 'CERRADO' || t.status === 'RESUELTO').length
    const openTickets = totalTickets - closedTickets

    // Tiempo promedio de respuesta (en horas)
    const ticketsWithResponse = tickets.filter(t => t.responseTime)
    const avgResponseTime = ticketsWithResponse.length > 0
      ? Math.round(ticketsWithResponse.reduce((sum, t) => sum + (t.responseTime || 0), 0) / ticketsWithResponse.length / 60 * 10) / 10
      : 0

    // Tiempo promedio de resolución (en horas)
    const ticketsWithResolution = tickets.filter(t => t.resolutionTime)
    const avgResolutionTime = ticketsWithResolution.length > 0
      ? Math.round(ticketsWithResolution.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / ticketsWithResolution.length / 60 * 10) / 10
      : 0

    // Tickets por técnico
    const ticketsByTechnician: { [key: string]: number } = {}
    tickets.forEach(ticket => {
      if (ticket.assignedTo) {
        const technicians = ticket.assignedTo.split(',').map(t => t.trim())
        technicians.forEach(tech => {
          ticketsByTechnician[tech] = (ticketsByTechnician[tech] || 0) + 1
        })
      }
    })

    // Tickets reabiertos
    const reopenedTickets = tickets.filter(t => (t.reopenedCount || 0) > 0).length

    // Problemas más frecuentes (por tipo)
    const issuesByType: { [key: string]: number } = {}
    tickets.forEach(ticket => {
      if (ticket.type) {
        issuesByType[ticket.type] = (issuesByType[ticket.type] || 0) + 1
      }
    })

    // Equipos con más fallas (por tipo de equipo)
    const failuresByEquipment: { [key: string]: number } = {}
    tickets.forEach(ticket => {
      if (ticket.equipmentType) {
        failuresByEquipment[ticket.equipmentType] = (failuresByEquipment[ticket.equipmentType] || 0) + 1
      }
    })

    // Clientes con más incidencias
    const incidentsByClient: { [key: string]: { name: string; count: number } } = {}
    tickets.forEach(ticket => {
      if (ticket.clientId && ticket.client) {
        if (!incidentsByClient[ticket.clientId]) {
          incidentsByClient[ticket.clientId] = { name: ticket.client.name, count: 0 }
        }
        incidentsByClient[ticket.clientId].count++
      }
    })

    // Tickets por estado
    const ticketsByStatus: { [key: string]: number } = {}
    tickets.forEach(ticket => {
      ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1
    })

    // Tickets por prioridad
    const ticketsByPriority: { [key: string]: number } = {}
    tickets.forEach(ticket => {
      const priority = ticket.priority || 'SIN_PRIORIDAD'
      ticketsByPriority[priority] = (ticketsByPriority[priority] || 0) + 1
    })

    const kpis = {
      totalTickets,
      openTickets,
      closedTickets,
      avgResponseTime, // en horas
      avgResolutionTime, // en horas
      ticketsByTechnician: Object.entries(ticketsByTechnician)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      reopenedTickets,
      issuesByType: Object.entries(issuesByType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      failuresByEquipment: Object.entries(failuresByEquipment)
        .map(([equipment, count]) => ({ equipment, count }))
        .sort((a, b) => b.count - a.count),
      incidentsByClient: Object.entries(incidentsByClient)
        .map(([id, data]) => ({ clientId: id, name: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 clientes
      ticketsByStatus: Object.entries(ticketsByStatus)
        .map(([status, count]) => ({ status, count })),
      ticketsByPriority: Object.entries(ticketsByPriority)
        .map(([priority, count]) => ({ priority, count })),
    }

    return apiSuccess(kpis)
  } catch (error) {
    console.error('Error fetching ticket KPIs:', error)
    return apiError('Error al obtener KPIs de tickets', 500)
  }
}
