'use client'

import { useState } from 'react'
import {
  isQuotePipelineTransitionAllowed,
  QUOTE_PIPELINE_STAGE_LABELS,
  QUOTE_PIPELINE_STAGES,
  type QuotePipelineStage,
} from '@/lib/quote-pipeline'

interface QuoteCard {
  id: string
  quoteNumber: string
  client: { id: string; name: string }
  company: { id: string; name: string }
  currency: string
  total: number
  status: string
  validUntil: string
  createdAt: string
  pipelineStage: QuotePipelineStage
  stageHistory?: Array<{
    fromStage: QuotePipelineStage | null
    toStage: QuotePipelineStage
    actorName: string
    changedAt: string
    source: string
  }>
}

interface QuoteKanbanProps {
  quotes: QuoteCard[]
  stageCounts: Record<QuotePipelineStage, number>
  canEditByCompany: Record<string, boolean>
  onOpen: (quoteId: string) => void
  onMove: (quoteId: string, stage: QuotePipelineStage, reopen?: boolean) => Promise<void>
}

const COLUMN_STYLES: Record<QuotePipelineStage, { dot: string; heading: string; drop: string }> = {
  PROSPECTO: { dot: 'bg-slate-500', heading: 'text-slate-700', drop: 'border-slate-300 bg-slate-50' },
  PROPUESTA: { dot: 'bg-blue-500', heading: 'text-blue-700', drop: 'border-blue-300 bg-blue-50' },
  NEGOCIACION: { dot: 'bg-amber-500', heading: 'text-amber-700', drop: 'border-amber-300 bg-amber-50' },
  REALIZADA: { dot: 'bg-emerald-500', heading: 'text-emerald-700', drop: 'border-emerald-300 bg-emerald-50' },
  RECHAZADA: { dot: 'bg-rose-500', heading: 'text-rose-700', drop: 'border-rose-300 bg-rose-50' },
}

function documentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviada',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
    EXPIRED: 'Vencida',
  }
  return labels[status] || status
}

function formatCurrency(currency: string, total: number) {
  const symbol = currency === 'NIO' ? 'C$' : '$'
  return `${symbol}${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function QuoteKanban({ quotes, stageCounts, canEditByCompany, onOpen, onMove }: QuoteKanbanProps) {
  const [dragOverStage, setDragOverStage] = useState<QuotePipelineStage | null>(null)
  const [movingQuoteId, setMovingQuoteId] = useState<string | null>(null)
  const [movingTargetStage, setMovingTargetStage] = useState<QuotePipelineStage | ''>('')

  const moveQuote = async (quoteId: string, stage: QuotePipelineStage, reopen = false) => {
    if (movingQuoteId !== null) return
    setMovingQuoteId(quoteId)
    setMovingTargetStage(stage)
    try {
      await onMove(quoteId, stage, reopen)
    } finally {
      setMovingQuoteId(null)
      setMovingTargetStage('')
    }
  }
  const canEditAnyCompany = Object.values(canEditByCompany).some(Boolean)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {QUOTE_PIPELINE_STAGES.map((stage) => {
        const stageQuotes = quotes.filter((quote) => quote.pipelineStage === stage)
        const style = COLUMN_STYLES[stage]
        const isDropTarget = dragOverStage === stage

        return (
          <section
            key={stage}
            aria-label={`${QUOTE_PIPELINE_STAGE_LABELS[stage]}: ${stageCounts[stage]} cotizaciones`}
            className={`w-[290px] min-w-[290px] rounded-xl border p-3 transition-colors ${
              isDropTarget ? style.drop : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(event) => {
              if (canEditAnyCompany) event.preventDefault()
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragOverStage(stage)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragOverStage(null)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragOverStage(null)
              const quoteId = event.dataTransfer.getData('text/plain')
              const quote = quotes.find((item) => item.id === quoteId)
              if (quote && canEditByCompany[quote.company.id] && isQuotePipelineTransitionAllowed(quote.pipelineStage, stage)) {
                void moveQuote(quote.id, stage)
              }
            }}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <h2 className={`flex items-center gap-2 font-semibold ${style.heading}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {QUOTE_PIPELINE_STAGE_LABELS[stage]}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                {stageCounts[stage]}
              </span>
            </header>

            <div className="min-h-32 space-y-3">
              {stageQuotes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 bg-white/70 px-3 py-6 text-center text-sm text-gray-500">
                  {stageCounts[stage] > 0
                    ? 'Sin tarjetas de esta etapa en esta página'
                    : 'Sin cotizaciones'}
                </p>
              ) : stageQuotes.map((quote) => {
                const latestEvent = quote.stageHistory?.[0]
                const isClosed = stage === 'REALIZADA' || stage === 'RECHAZADA'
                const canEditQuote = Boolean(canEditByCompany[quote.company.id])

                return (
                  <article
                    key={quote.id}
                    draggable={canEditQuote && !isClosed && movingQuoteId === null}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', quote.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
                      canEditQuote && !isClosed ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          onClick={() => onOpen(quote.id)}
                          className="text-left text-sm font-semibold text-gray-900 hover:text-primary"
                        >
                          {quote.quoteNumber}
                        </button>
                        <p className="mt-1 text-sm text-gray-700">{quote.client.name}</p>
                        <p className="text-xs text-gray-500">{quote.company.name}</p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(quote.currency, quote.total)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {documentStatusLabel(quote.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Vence {new Date(quote.validUntil).toLocaleDateString('es-NI')}
                      </span>
                    </div>

                    {latestEvent && (
                      <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        {latestEvent.actorName} · {new Date(latestEvent.changedAt).toLocaleString('es-NI')}
                      </p>
                    )}

                    {canEditQuote && isClosed && (
                      <button
                        type="button"
                      disabled={movingQuoteId !== null}
                        onClick={() => void moveQuote(quote.id, 'NEGOCIACION', true)}
                        className="mt-3 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Reabrir en Negociación
                      </button>
                    )}
                    {canEditQuote && !isClosed && (
                      <label className="mt-3 block">
                        <span className="sr-only">Mover {quote.quoteNumber} a otra etapa</span>
                        <select
                          value={movingQuoteId === quote.id ? movingTargetStage : ''}
                          disabled={movingQuoteId !== null}
                          onChange={(event) => {
                            if (event.target.value) {
                              void moveQuote(quote.id, event.target.value as QuotePipelineStage)
                            }
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 disabled:opacity-50"
                        >
                          <option value="">Mover a otra etapa…</option>
                          {QUOTE_PIPELINE_STAGES.filter((target) =>
                            isQuotePipelineTransitionAllowed(quote.pipelineStage, target)
                          ).map((target) => (
                            <option key={target} value={target}>{QUOTE_PIPELINE_STAGE_LABELS[target]}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
