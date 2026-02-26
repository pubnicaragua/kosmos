import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { z } from 'zod'
import { getCompanyAccess } from '@/lib/company-access'

const marketingUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  channel: z.enum(['REDES_SOCIALES', 'EMAIL', 'PUBLICIDAD_DIGITAL', 'CONTENIDO', 'EVENTOS', 'OTRO']).optional(),
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
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    let campaign: any
    try {
      campaign = await prisma.marketingCampaign.findUnique({
        where: { id: params.id },
        include: { company: { select: { name: true } } },
      })
    } catch (dbErr: any) {
      if (dbErr?.code === 'P2022' || dbErr?.message?.includes('column') || dbErr?.message?.includes('Unknown')) {
        campaign = await prisma.marketingCampaign.findUnique({
          where: { id: params.id },
          select: {
            id: true, name: true, description: true, channel: true, status: true,
            budget: true, spent: true, startDate: true, endDate: true,
            targetAudience: true, metrics: true, assignedTo: true,
            companyId: true, createdBy: true, createdAt: true, updatedAt: true,
            company: { select: { name: true } },
          },
        })
        if (campaign) campaign = { ...campaign, adType: null, evidenceUrl: null, approvalStatus: 'PENDING' }
      } else {
        throw dbErr
      }
    }

    if (!campaign) return apiError('Campaña no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, campaign.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const creator = await prisma.user.findUnique({
      where: { id: campaign.createdBy },
      select: { name: true },
    })

    return apiSuccess({
      ...campaign,
      createdByName: creator?.name || campaign.createdBy,
    })
  } catch (error) {
    console.error('Error fetching marketing campaign:', error)
    return apiError('Error al obtener campaña', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = marketingUpdateSchema.parse(body)

    const existingCampaign = await prisma.marketingCampaign.findUnique({
      where: { id: params.id },
    })

    if (!existingCampaign) return apiError('Campaña no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existingCampaign.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.channel !== undefined) updateData.channel = validatedData.channel
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.budget !== undefined) updateData.budget = validatedData.budget
    if (validatedData.spent !== undefined) updateData.spent = validatedData.spent
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.targetAudience !== undefined) updateData.targetAudience = validatedData.targetAudience
    if (validatedData.metrics !== undefined) updateData.metrics = validatedData.metrics
    if (validatedData.assignedTo !== undefined) updateData.assignedTo = validatedData.assignedTo
    if (validatedData.adType !== undefined) updateData.adType = validatedData.adType
    if (validatedData.evidenceUrl !== undefined) updateData.evidenceUrl = validatedData.evidenceUrl

    // Strip columns that may not exist in production DB
    const safeUpdateData = { ...updateData }
    let campaign: any
    try {
      campaign = await prisma.marketingCampaign.update({
        where: { id: params.id },
        data: safeUpdateData,
        include: { company: { select: { name: true } } },
      })
    } catch (dbErr: any) {
      if (dbErr?.code === 'P2022' || dbErr?.message?.includes('column') || dbErr?.message?.includes('Unknown')) {
        const { adType, evidenceUrl, approvalStatus, ...coreSafeData } = safeUpdateData
        campaign = await prisma.marketingCampaign.update({
          where: { id: params.id },
          data: coreSafeData,
          include: { company: { select: { name: true } } },
        })
      } else {
        throw dbErr
      }
    }

    return apiSuccess(campaign)
  } catch (error) {
    console.error('Error updating marketing campaign:', error)
    return apiError('Error al actualizar campaña', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const existingCampaign = await prisma.marketingCampaign.findUnique({
      where: { id: params.id },
    })

    if (!existingCampaign) return apiError('Campaña no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existingCampaign.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.marketingCampaign.delete({
      where: { id: params.id },
    })

    return apiSuccess({ message: 'Campaña eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting marketing campaign:', error)
    return apiError('Error al eliminar campaña', 500)
  }
}
