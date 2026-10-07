import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    // Only SUPER_ADMIN / ADMIN can access this
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { userCompanies: { where: { endedAt: null }, select: { role: true } } },
    })
    const isAdmin = requestingUser?.userCompanies.some(
      (uc) => uc.role === 'SUPER_ADMIN' || uc.role === 'ADMIN'
    )
    if (!isAdmin) {
      return errorResponse('Acceso no autorizado', 403)
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date()
    since.setDate(since.getDate() - days)

    // All users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true },
      orderBy: { name: 'asc' },
    })

    // Gather stats per user — optimized with single aggregated query
    // Get all counts in one query per table instead of per-user
    const [ticketsStats, activitiesStats, campaignsStats] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['createdBy'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['assignedTo'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.marketingCampaign.groupBy({
        by: ['createdBy'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
    ])

    // Build lookup maps for O(1) access
    const ticketCountByUser = Object.fromEntries(ticketsStats.map(t => [t.createdBy, t._count.id]))
    const activityCountByUser = Object.fromEntries(
      activitiesStats.map(a => [a.assignedTo, a._count.id]).filter(([k]) => k)
    )
    const campaignCountByUser = Object.fromEntries(campaignsStats.map(c => [c.createdBy, c._count.id]))

    // Latest tickets for all users in one query
    const latestTickets = await prisma.ticket.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, title: true, status: true, createdBy: true },
      take: users.length,
    })

    const latestTicketByUser = Object.fromEntries(
      latestTickets.map(t => [t.createdBy, { createdAt: t.createdAt, title: t.title, status: t.status }])
    )

    const userStats = users.map(user => {
      const ticketsCreated = ticketCountByUser[user.id] || 0
      const ticketsAssigned = activityCountByUser[user.name] || 0
      const activitiesAssigned = 0
      const campaignsCreated = campaignCountByUser[user.id] || 0
      const recent = latestTicketByUser[user.id]

      return {
        user,
        stats: {
          ticketsCreated,
          ticketsAssigned,
          activitiesAssigned,
          campaignsCreated,
          total: ticketsCreated + ticketsAssigned + activitiesAssigned + campaignsCreated,
        },
        lastActive: recent?.createdAt ?? null,
        recentTicket: recent,
      }
    })

    // Recent system-wide feed from Ticket and MarketingCampaign (have createdBy)
    // Plus recent Activities and Opportunities (no createdBy — show without user attribution)
    const [recentTickets, recentCampaigns, recentActivities, recentOpportunities] = await Promise.all([
      prisma.ticket.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true, title: true, status: true, createdAt: true, createdBy: true,
          company: { select: { name: true } },
        },
      }),
      prisma.marketingCampaign.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true, name: true, status: true, createdAt: true, createdBy: true,
          company: { select: { name: true } },
        },
      }),
      prisma.activity.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, title: true, status: true, assignedTo: true, createdAt: true,
          company: { select: { name: true } },
        },
      }),
      prisma.opportunity.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, title: true, stage: true, assignedTo: true, createdAt: true,
          company: { select: { name: true } },
        },
      }),
    ])

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
    // Build a name->user lookup for activities/opportunities assigned by name
    const userByName = Object.fromEntries(users.map((u) => [u.name, u]))

    const feed = [
      ...recentTickets.map((t) => ({
        id: t.id,
        type: 'ticket' as const,
        title: t.title,
        status: t.status,
        company: t.company.name,
        createdAt: t.createdAt,
        user: userMap[t.createdBy] ?? { id: t.createdBy, name: 'Sistema', email: '', avatar: null },
      })),
      ...recentCampaigns.map((c) => ({
        id: c.id,
        type: 'campaign' as const,
        title: c.name,
        status: c.status,
        company: c.company.name,
        createdAt: c.createdAt,
        user: userMap[c.createdBy] ?? { id: c.createdBy, name: 'Sistema', email: '', avatar: null },
      })),
      ...recentActivities.map((a) => {
        const assignee = a.assignedTo ? userByName[a.assignedTo.split(',')[0].trim()] : null
        return {
          id: a.id,
          type: 'activity' as const,
          title: a.title,
          status: String(a.status),
          company: a.company.name,
          createdAt: a.createdAt,
          user: assignee ?? { id: '', name: a.assignedTo || 'Sin asignar', email: '', avatar: null },
        }
      }),
      ...recentOpportunities.map((o) => {
        const assignee = o.assignedTo ? userByName[o.assignedTo.split(',')[0].trim()] : null
        return {
          id: o.id,
          type: 'opportunity' as const,
          title: o.title,
          status: o.stage,
          company: o.company.name,
          createdAt: o.createdAt,
          user: assignee ?? { id: '', name: o.assignedTo || 'Sin asignar', email: '', avatar: null },
        }
      }),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60)

    return successResponse({
      userStats: userStats.sort((a, b) => b.stats.total - a.stats.total),
      feed,
      period: { days, since },
    })
  } catch (error) {
    console.error('Admin feed error:', error)
    return errorResponse('Error al obtener el feed de actividad', 500)
  }
}
