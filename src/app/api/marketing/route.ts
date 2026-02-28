import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { z } from 'zod'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

const marketingSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  channel: z.enum(['REDES_SOCIALES', 'EMAIL', 'PUBLICIDAD_DIGITAL', 'CONTENIDO', 'EVENTOS', 'OTRO']),
  status: z.enum(['PLANIFICACION', 'EN_CURSO', 'PAUSADA', 'COMPLETADA', 'CANCELADA']).optional(),
  budget: z.number().optional(),
  spent: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetAudience: z.string().optional(),
  metrics: z.string().optional(),
  assignedTo: z.string().optional(),
  adType: z.string().optional(),
  evidenceUrl: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const search = searchParams.get('search')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId || { in: companyIds }
    if (status) where.status = status
    if (channel) where.channel = channel
    
    // Búsqueda general por nombre o descripción
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    let campaigns: any[]
    try {
      campaigns = await prisma.marketingCampaign.findMany({
        where,
        include: {
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (dbErr: any) {
      // Fallback: production DB may be missing newer columns (adType, approvalStatus, evidenceUrl)
      if (dbErr?.code === 'P2022' || dbErr?.message?.includes('column') || dbErr?.message?.includes('Unknown')) {
        const rows = await prisma.marketingCampaign.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            channel: true,
            status: true,
            budget: true,
            spent: true,
            startDate: true,
            endDate: true,
            targetAudience: true,
            metrics: true,
            assignedTo: true,
            companyId: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            company: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
        campaigns = rows.map((r: any) => ({ ...r, adType: null, evidenceUrl: null, approvalStatus: 'PENDING' }))
      } else {
        throw dbErr
      }
    }

    return apiSuccess(campaigns)
  } catch (error) {
    console.error('Error fetching marketing campaigns:', error)
    return apiError('Error al obtener campañas', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = marketingSchema.parse(body)

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const baseData = {
      name: validatedData.name,
      description: validatedData.description || null,
      channel: validatedData.channel,
      status: validatedData.status || 'PLANIFICACION',
      budget: validatedData.budget || null,
      spent: validatedData.spent || 0,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      targetAudience: validatedData.targetAudience || null,
      metrics: validatedData.metrics || null,
      assignedTo: validatedData.assignedTo || null,
      adType: validatedData.adType || null,
      evidenceUrl: validatedData.evidenceUrl || null,
      approvalStatus: 'PENDING' as string,
      companyId: validatedData.companyId,
      createdBy: decoded.userId,
    }

    let campaign: any
    try {
      campaign = await prisma.marketingCampaign.create({
        data: baseData as any,
        include: { company: { select: { name: true } } },
      })
    } catch (createErr: any) {
      // Fallback: some columns may not exist in production DB yet
      const errMsg = String(createErr?.message || '').toLowerCase()
      const isColumnMissing = createErr?.code === 'P2022' || errMsg.includes('column') || errMsg.includes('does not exist')
      if (isColumnMissing) {
        // Intentar sin campos opcionales que pueden no existir
        const { adType, evidenceUrl, approvalStatus, ...safeData } = baseData
        try {
          campaign = await prisma.marketingCampaign.create({
            data: safeData as any,
            include: { company: { select: { name: true } } },
          })
        } catch (fallbackErr: any) {
          // Si aún falla, intentar con campos mínimos
          console.error('Marketing fallback also failed:', fallbackErr)
          throw fallbackErr
        }
      } else {
        throw createErr
      }
    }

    return apiSuccess(campaign, undefined, 201)
  } catch (error) {
    console.error('Error creating marketing campaign:', error)
    return apiError('Error al crear campaña', 500)
  }
}
