'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import QuoteKanban from './QuoteKanban'
import {
  QUOTE_PAGE_SIZES,
  QUOTE_PIPELINE_STAGES,
  QUOTE_PIPELINE_STAGE_LABELS,
  type QuotePageSize,
  type QuotePipelineStage,
} from '@/lib/quote-pipeline'

interface Quote {
  id: string
  quoteNumber: string
  client: { id: string; name: string }
  company: { id: string; name: string }
  currency: string
  total: number
  pipelineStage: QuotePipelineStage
  validUntil: string
  createdAt: string
  createdByUser?: { name: string } | null
  stageHistory?: Array<{
    fromStage: QuotePipelineStage | null
    toStage: QuotePipelineStage
    actorName: string
    changedAt: string
    source: string
  }>
}

interface Company {
  id: string
  name: string
}

interface QuotePagination {
  page: number
  pageSize: QuotePageSize
  total: number
  totalPages: number
}

const ZERO_STAGE_COUNTS: Record<QuotePipelineStage, number> = {
  PROSPECTO: 0,
  PROPUESTA: 0,
  NEGOCIACION: 0,
  REALIZADA: 0,
  RECHAZADA: 0,
}

export default function CotizacionesList() {
  const router = useRouter()
  const permissions = useModulePermissions('cotizaciones')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list')
  const [isSearchVisible, setIsSearchVisible] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStage, setSelectedStage] = useState<QuotePipelineStage | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<QuotePageSize>(25)
  const [pagination, setPagination] = useState<QuotePagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  })
  const [stageCounts, setStageCounts] = useState(ZERO_STAGE_COUNTS)
  const [canEditByCompany, setCanEditByCompany] = useState<Record<string, boolean>>({})
  const [loadError, setLoadError] = useState('')
  const [moveError, setMoveError] = useState('')
  const quoteRequestSequence = useRef(0)
  const hasLoadedQuotes = useRef(false)
  const activeStageFilter = activeTab === 'list' ? selectedStage : 'all'
  const currentQueryKey = `${page}:${pageSize}:${selectedCompany}:${search}:${activeStageFilter}:${activeTab}`
  const currentQueryKeyRef = useRef(currentQueryKey)
  currentQueryKeyRef.current = currentQueryKey

  useEffect(() => {
    if (!permissions.loading && !permissions.canView && !permissions.canCreate) {
      const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
      if (activeCompany?.id && activeCompany.id !== 'all') {
        router.push('/sistema/unauthorized')
      }
    }
  }, [permissions.loading, permissions.canView, permissions.canCreate, router])

  useEffect(() => {
    const loadMetadata = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const [userRes, companiesRes] = await Promise.all([
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const [userData, companiesData] = await Promise.all([userRes.json(), companiesRes.json()])
        if (userData.success) setUserRole(userData.data.role || 'USER')
        if (companiesData.success) setCompanies(companiesData.data)
      } catch (error) {
        console.error('Error loading quote page metadata:', error)
      }
    }

    void loadMetadata()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const loadQuotes = useCallback(async (showLoading = true) => {
    const requestSequence = ++quoteRequestSequence.current
    const queryKey = `${page}:${pageSize}:${selectedCompany}:${search}:${activeStageFilter}:${activeTab}`
    const token = localStorage.getItem('accessToken')
    if (!token) {
      if (requestSequence === quoteRequestSequence.current) {
        hasLoadedQuotes.current = true
        setIsLoading(false)
      }
      return
    }

    if (showLoading) setIsLoading(true)
    setLoadError('')

    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (selectedCompany !== 'all') params.set('companyId', selectedCompany)
      if (search) params.set('search', search)
      if (activeStageFilter !== 'all') params.set('pipelineStage', activeStageFilter)

      const response = await fetch(`/api/quotes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.success || !result.data?.items) {
        throw new Error(result.error || 'No se pudieron cargar las cotizaciones')
      }

      if (requestSequence !== quoteRequestSequence.current || currentQueryKeyRef.current !== queryKey) return
      setQuotes(result.data.items)
      setPagination(result.data.pagination)
      setStageCounts({ ...ZERO_STAGE_COUNTS, ...result.data.stageCounts })
      setCanEditByCompany(result.data.canEditByCompany || {})
    } catch (error) {
      if (requestSequence !== quoteRequestSequence.current || currentQueryKeyRef.current !== queryKey) return
      console.error('Error fetching quotes:', error)
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones')
    } finally {
      if (requestSequence === quoteRequestSequence.current && currentQueryKeyRef.current === queryKey) {
        hasLoadedQuotes.current = true
        setIsLoading(false)
      }
    }
  }, [activeStageFilter, activeTab, page, pageSize, search, selectedCompany])

  useEffect(() => {
    void loadQuotes(!hasLoadedQuotes.current)
  }, [loadQuotes])

  const handleMoveQuote = async (quoteId: string, pipelineStage: QuotePipelineStage, reopen = false) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const currentQuote = quotes.find((quote) => quote.id === quoteId)
    if (!currentQuote) return

    const previousStage = currentQuote.pipelineStage
    setMoveError('')
    quoteRequestSequence.current += 1

    if (previousStage !== pipelineStage) {
      setQuotes((currentQuotes) => currentQuotes.map((quote) =>
        quote.id === quoteId ? { ...quote, pipelineStage } : quote
      ))
      setStageCounts((currentCounts) => ({
        ...currentCounts,
        [previousStage]: Math.max(0, currentCounts[previousStage] - 1),
        [pipelineStage]: currentCounts[pipelineStage] + 1,
      }))
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/pipeline-stage`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pipelineStage, ...(reopen ? { reopen: true } : {}) }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo mover la cotización')
      }

      const updatedQuote = result.data as Quote | null
      if (!updatedQuote) throw new Error('No se pudo actualizar la cotización')

      quoteRequestSequence.current += 1
      setQuotes((currentQuotes) => currentQuotes.map((quote) =>
        quote.id === quoteId
          ? {
              ...quote,
              pipelineStage: updatedQuote.pipelineStage,
              stageHistory: updatedQuote.stageHistory,
            }
          : quote
      ))

      if (pipelineStage !== updatedQuote.pipelineStage) {
        setStageCounts((currentCounts) => ({
          ...currentCounts,
          [pipelineStage]: Math.max(0, currentCounts[pipelineStage] - 1),
          [updatedQuote.pipelineStage]: currentCounts[updatedQuote.pipelineStage] + 1,
        }))
      }
    } catch (error) {
      quoteRequestSequence.current += 1
      if (previousStage !== pipelineStage) {
        setQuotes((currentQuotes) => currentQuotes.map((quote) =>
          quote.id === quoteId ? { ...quote, pipelineStage: previousStage } : quote
        ))
        setStageCounts((currentCounts) => ({
          ...currentCounts,
          [pipelineStage]: Math.max(0, currentCounts[pipelineStage] - 1),
          [previousStage]: currentCounts[previousStage] + 1,
        }))
      }
      console.error('Error moving quote:', error)
      setMoveError(error instanceof Error ? error.message : 'No se pudo mover la cotización')
    }
  }

  const handleViewQuote = (quoteId: string) => router.push(`/clientes/cotizacion/${quoteId}`)
  const handleEditQuote = (quoteId: string) => router.push(`/clientes/cotizacion/${quoteId}/editar`)

  const lastPage = Math.max(1, pagination.totalPages)

  if (isLoading) return <SkeletonTable />

  return (
    <div className={activeTab === 'kanban' ? 'flex h-full min-h-0 flex-col gap-4' : 'space-y-6'}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => router.push('/clientes/cotizacion')} className="hover:text-primary">COTIZACIONES</button>
            <span>&gt;</span>
            <span className="font-medium text-primary">COTIZACIONES</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta y gestiona el estado de tus cotizaciones</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
            <Select
              options={[
                { value: 'all', label: 'Todas las empresas' },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
              value={selectedCompany}
              onChange={(event) => {
                setSelectedCompany(event.target.value)
                setPage(1)
              }}
              className="w-64"
            />
          )}
          {permissions.canCreate && (
            <Button onClick={() => router.push('/clientes/cotizacion/nueva')}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cotización
            </Button>
          )}
        </div>
      </div>

      <div
        id="quote-search-panel"
        className={`${activeTab === 'list' || isSearchVisible ? 'flex' : 'hidden'} shrink-0 flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4`}
        role="search"
        aria-label="Buscar cotizaciones"
      >
        <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
          Buscar cotizaciones
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Número, cliente o empresa"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        {activeTab === 'list' && (
          <Select
            label="Estado"
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...QUOTE_PIPELINE_STAGES.map((stage) => ({
                value: stage,
                label: QUOTE_PIPELINE_STAGE_LABELS[stage],
              })),
            ]}
            value={selectedStage}
            onChange={(event) => {
              setSelectedStage(event.target.value as QuotePipelineStage | 'all')
              setPage(1)
            }}
            className="w-full sm:w-52"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-gray-200">
        <div className="flex" role="tablist" aria-label="Vistas de cotizaciones">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'list'}
            onClick={() => setActiveTab('list')}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'kanban'}
            onClick={() => setActiveTab('kanban')}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'kanban' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Kanban
          </button>
        </div>
        {activeTab === 'kanban' && (
          <div className="flex items-center gap-3">
            {!isSearchVisible && search && (
              <span className="hidden text-xs text-gray-500 sm:inline">Filtro activo</span>
            )}
            <button
              type="button"
              aria-controls="quote-search-panel"
              aria-expanded={isSearchVisible}
              onClick={() => setIsSearchVisible((visible) => !visible)}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {isSearchVisible ? 'Ocultar buscador' : 'Mostrar buscador'}
            </button>
          </div>
        )}
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {moveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{moveError}</p>}

      {activeTab === 'list' ? (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Número', 'Cliente', 'Empresa', 'Total', 'Estado', 'Válida hasta', 'Creado por', 'Acciones'].map((label) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotes.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {search || activeStageFilter !== 'all'
                    ? 'No hay cotizaciones que coincidan con los filtros'
                    : 'No hay cotizaciones en esta página'}
                </td></tr>
              ) : quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{quote.quoteNumber}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{quote.client.name}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{quote.company.name}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                    {quote.currency === 'NIO' ? 'C$' : '$'}{quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {QUOTE_PIPELINE_STAGE_LABELS[quote.pipelineStage]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(quote.validUntil).toLocaleDateString('es-NI')}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{quote.createdByUser?.name || 'N/A'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
                    <button onClick={() => handleViewQuote(quote.id)} className="mr-3 text-primary hover:text-primary/80">Ver</button>
                    {canEditByCompany[quote.company.id] && <button onClick={() => handleEditQuote(quote.id)} className="text-primary hover:text-primary/80">Editar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <QuoteKanban
            quotes={quotes}
            stageCounts={stageCounts}
            canEditByCompany={canEditByCompany}
            onOpen={handleViewQuote}
            onMove={handleMoveQuote}
          />
        </div>
      )}

      <div className={`flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 ${activeTab === 'kanban' ? 'mt-auto' : ''}`}>
        <div className="text-sm text-gray-600">
          {pagination.total === 0
            ? '0 cotizaciones'
            : `Página ${page} de ${lastPage} · ${pagination.total} cotizaciones`}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Por página
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as QuotePageSize)
                setPage(1)
              }}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              {QUOTE_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pagination.totalPages === 0 || page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
