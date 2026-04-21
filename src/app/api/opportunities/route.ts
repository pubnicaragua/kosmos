import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = { companyId: companyId || { in: companyIds } }
    if (stage) where.stage = stage
    
    // Búsqueda general por título o cliente
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
      ]
    }

    let opportunities: any[]
    try {
      opportunities = await prisma.opportunity.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
    } catch (dbErr: any) {
      // Fallback: some columns may not exist in production DB yet (e.g. priority, description)
      if (dbErr?.code === 'P2022' || dbErr?.message?.includes('column') || dbErr?.message?.includes('priority') || dbErr?.message?.includes('description')) {
        opportunities = await (prisma.opportunity as any).findMany({
          where,
          select: {
            id: true, companyId: true, title: true, client: true, value: true,
            stage: true, status: true, assignedTo: true, closeDate: true,
            createdAt: true, updatedAt: true, company: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      } else {
        throw dbErr
      }
    }

    return apiSuccess(opportunities.map((opp: any) => ({
      id: opp.id,
      company: opp.company.name,
      companyId: opp.companyId,
      title: opp.title,
      client: opp.client,
      value: opp.value,
      stage: opp.stage,
      status: opp.status,
      assignedTo: opp.assignedTo,
      closeDate: opp.closeDate?.toISOString(),
      priority: opp.priority || 'MEDIA',
      description: opp.description || null,
      assignedUsers: opp.assignedUsers || '[]',
      currency: opp.currency || 'USD',
      createdAt: opp.createdAt.toISOString(),
    })))
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return apiError('Error al obtener oportunidades', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, ...oppData } = body

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const { priority, description, ...baseOppData } = oppData
    let opportunity: any
    try {
      opportunity = await prisma.opportunity.create({
        data: {
          ...baseOppData,
          value: baseOppData.value || 0,
          companyId,
          closeDate: oppData.closeDate ? new Date(oppData.closeDate) : null,
          currency: oppData.currency || 'USD',
          assignedUsers: oppData.assignedUsers || '[]',
          ...(priority !== undefined ? { priority } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      })
    } catch (e: any) {
      if (e?.code === 'P2022') {
        // columnas opcionales no existen aún - crear sin priority/description
        opportunity = await prisma.opportunity.create({
          data: {
            ...baseOppData,
            companyId,
            closeDate: oppData.closeDate ? new Date(oppData.closeDate) : null,
          },
        })
      } else throw e
    }

    // Notificar a los usuarios asignados (vía assignedUsers JSON)
    if (oppData.assignedUsers) {
      try {
        const userIds = JSON.parse(oppData.assignedUsers) as string[]
        for (const targetUserId of userIds) {
          if (targetUserId !== decoded.userId) {
            await notifyAssignment({
              assignedUserId: targetUserId,
              assignedByUserId: decoded.userId,
              itemType: 'opportunity',
              itemTitle: oppData.title,
              itemId: opportunity.id,
            })
          }
        }
      } catch (err) {
        console.error('Error parsing assignedUsers for notification:', err)
      }
    }

    return apiSuccess(opportunity, undefined, 201)
  } catch (error: any) {
    console.error('Error creating opportunity:', error)
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`Datos inválidos: ${issues}`, 400)
    }
    return apiError(`Error al crear oportunidad: ${error?.message || error}`, 500)
  }
}
