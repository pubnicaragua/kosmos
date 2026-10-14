import { NextRequest } from 'next/server'
import { QuotePipelineStage } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { stripLegacyQuoteDocumentStatus } from '@/lib/quote-public-view'
import {
  isQuotePipelineTransitionAllowed,
  QUOTE_PIPELINE_STAGES,
  recordQuotePipelineTransition,
} from '@/lib/quote-pipeline'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    if (typeof body.pipelineStage !== 'string' ||
        !QUOTE_PIPELINE_STAGES.includes(body.pipelineStage as QuotePipelineStage)) {
      return apiError('Etapa comercial inválida', 400)
    }
    if (body.reopen !== undefined && typeof body.reopen !== 'boolean') {
      return apiError('Indicador de reapertura inválido', 400)
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true, pipelineStage: true },
    })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, quote.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, quote.companyId, 'cotizaciones')
    if (!moduleAccess.canEdit) return apiError('No tienes permisos para mover cotizaciones', 403)

    const targetStage = body.pipelineStage as QuotePipelineStage
    const isReopen = body.reopen === true
    if (!isQuotePipelineTransitionAllowed(quote.pipelineStage, targetStage, isReopen)) {
      return apiError('Transición de etapa no permitida', 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: decoded.userId },
        select: { name: true },
      })
      if (!actor) throw new Error('QUOTE_STAGE_ACTOR_NOT_FOUND')

      await recordQuotePipelineTransition(tx, {
        quoteId: quote.id,
        fromStage: quote.pipelineStage,
        toStage: targetStage,
        actorId: decoded.userId,
        actorName: actor.name,
        reopen: isReopen,
      })

      return tx.quote.findUnique({
        where: { id: quote.id },
        include: {
          stageHistory: { orderBy: { changedAt: 'desc' } },
        },
      })
    })

    if (!updated) return apiError('No se pudo actualizar la cotización', 500)
    return apiSuccess(stripLegacyQuoteDocumentStatus(updated))
  } catch (error: any) {
    if (error?.message === 'QUOTE_STAGE_CONFLICT') {
      return apiError('La etapa cambió en otra sesión; actualiza la cotización e intenta de nuevo', 409)
    }
    if (error?.message === 'QUOTE_STAGE_ACTOR_NOT_FOUND') {
      return apiError('Usuario no encontrado', 401)
    }

    console.error('Error updating quote pipeline stage:', error)
    return apiError('Error al actualizar etapa comercial', 500)
  }
}
