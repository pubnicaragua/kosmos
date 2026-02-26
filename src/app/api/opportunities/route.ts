import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const stage = searchParams.get('stage')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = { companyId: companyId || { in: companyIds } }
    if (stage) where.stage = stage

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

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

    const opportunity = await prisma.opportunity.create({
      data: {
        ...oppData,
        companyId,
        closeDate: oppData.closeDate ? new Date(oppData.closeDate) : null,
      },
    })

    return apiSuccess(opportunity, undefined, 201)
  } catch (error) {
    console.error('Error creating opportunity:', error)
    return apiError('Error al crear oportunidad', 500)
  }
}
