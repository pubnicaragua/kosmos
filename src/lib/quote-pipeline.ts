export const QUOTE_PIPELINE_STAGES = [
  'PROSPECTO',
  'PROPUESTA',
  'NEGOCIACION',
  'REALIZADA',
  'RECHAZADA',
] as const

export type QuotePipelineStage = (typeof QUOTE_PIPELINE_STAGES)[number]

export const QUOTE_PIPELINE_STAGE_LABELS: Record<QuotePipelineStage, string> = {
  PROSPECTO: 'Prospecto',
  PROPUESTA: 'Propuesta',
  NEGOCIACION: 'Negociación',
  REALIZADA: 'Realizada',
  RECHAZADA: 'Rechazada',
}

export const QUOTE_PAGE_SIZES = [25, 50, 100] as const
export type QuotePageSize = (typeof QUOTE_PAGE_SIZES)[number]

interface QuotePipelineTransaction {
  quote: {
    updateMany: (args: {
      where: { id: string; pipelineStage: QuotePipelineStage }
      data: { pipelineStage: QuotePipelineStage; closedAt: Date | null }
    }) => Promise<{ count: number }>
  }
  quoteStageHistory: {
    create: (args: {
      data: {
        quoteId: string
        fromStage: QuotePipelineStage
        toStage: QuotePipelineStage
        actorId: string
        actorName: string
        source: 'USER'
      }
    }) => Promise<unknown>
  }
}

const NORMAL_TRANSITIONS: Record<QuotePipelineStage, readonly QuotePipelineStage[]> = {
  PROSPECTO: ['PROPUESTA', 'NEGOCIACION', 'RECHAZADA'],
  PROPUESTA: ['NEGOCIACION', 'REALIZADA', 'RECHAZADA'],
  NEGOCIACION: ['PROPUESTA', 'REALIZADA', 'RECHAZADA'],
  REALIZADA: [],
  RECHAZADA: [],
}

export function isQuotePipelineTransitionAllowed(
  from: string,
  to: string,
  reopen = false
): boolean {
  if (!QUOTE_PIPELINE_STAGES.includes(from as QuotePipelineStage) ||
      !QUOTE_PIPELINE_STAGES.includes(to as QuotePipelineStage)) {
    return false
  }

  if (reopen) {
    return (from === 'REALIZADA' || from === 'RECHAZADA') && to === 'NEGOCIACION'
  }

  return NORMAL_TRANSITIONS[from as QuotePipelineStage].includes(to as QuotePipelineStage)
}

export function getLegacyQuotePipelineStage(status: string): QuotePipelineStage {
  return status === 'SENT' ? 'PROPUESTA' : 'PROSPECTO'
}

export async function recordQuotePipelineTransition(
  tx: QuotePipelineTransaction,
  input: {
    quoteId: string
    fromStage: QuotePipelineStage
    toStage: QuotePipelineStage
    actorId: string
    actorName: string
    reopen?: boolean
  }
) {
  if (!isQuotePipelineTransitionAllowed(input.fromStage, input.toStage, input.reopen)) {
    throw new Error('QUOTE_STAGE_TRANSITION_NOT_ALLOWED')
  }

  const isClosed = input.toStage === 'REALIZADA' || input.toStage === 'RECHAZADA'
  const update = await tx.quote.updateMany({
    where: { id: input.quoteId, pipelineStage: input.fromStage },
    data: { pipelineStage: input.toStage, closedAt: isClosed ? new Date() : null },
  })
  if (update.count !== 1) throw new Error('QUOTE_STAGE_CONFLICT')

  return tx.quoteStageHistory.create({
    data: {
      quoteId: input.quoteId,
      fromStage: input.fromStage,
      toStage: input.toStage,
      actorId: input.actorId,
      actorName: input.actorName,
      source: 'USER',
    },
  })
}

export function parseQuotePagination(
  pageParam: string | null,
  pageSizeParam: string | null
): { page: number; pageSize: QuotePageSize; skip: number } | null {
  if (pageParam === null && pageSizeParam === null) return null

  const page = pageParam === null ? 1 : Number(pageParam)
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new Error('Página inválida')
  }

  const requestedPageSize = pageSizeParam === null ? 25 : Number(pageSizeParam)
  if (!QUOTE_PAGE_SIZES.includes(requestedPageSize as QuotePageSize)) {
    throw new Error('Tamaño de página inválido')
  }

  const pageSize = requestedPageSize as QuotePageSize
  const skip = (page - 1) * pageSize
  if (!Number.isSafeInteger(skip) || skip > 2_147_483_647) {
    throw new Error('Página inválida')
  }
  return { page, pageSize, skip }
}
