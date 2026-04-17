'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'
import { exportWithCompanyHeader } from '@/lib/export-utils'

const FILTERS_STORAGE_KEY = 'ingresosFilters'

interface CompanyOption {
  id: string
  name: string
}

interface Income {
  id: string
  company: string
  companyId: string
  refNumber: string
  client: string
  concept: string
  method: string
  amount: number
  margin: number
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'ERROR'
  date: string
  companyLogo?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  companyRuc?: string | null
  companyIndustry?: string | null
  companyQuoteHeader?: string | null
  companyQuoteFooter?: string | null
  companyInvoiceHeader?: string | null
  companyInvoiceFooter?: string | null
  companyInvoiceColor?: string | null
}

interface IncomeRowDraft {
  tempId: number
  sourceId?: string
  companyId: string
  date: string
  refNumber: string
  client: string
  concept: string
  method: string
  amount: string
  currency: string
  margin: string
  status: Income['status']
}

interface IncomeSummary {
  totalIncomes: number
  totalGrowth: number
  pendingIncomes: number
  pendingCount: number
  averageSale: number
  averageGrowth: number
}

export default function IngresosPage() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (typeof window === 'undefined') return 'all'
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || 'all'
  })
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedMethod, setSelectedMethod] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [draftRows, setDraftRows] = useState<IncomeRowDraft[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, IncomeRowDraft>>({})
  const [showImportModal, setShowImportModal] = useState(false)
  const [clientsList, setClientsList] = useState<string[]>([])
  const [selectedPrintIncome, setSelectedPrintIncome] = useState<Income | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDateRangeByPeriod = (period: string) => {
    const endDate = new Date()
    const startDate = new Date(endDate)

    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3)
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1)
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
    const urlParams = new URLSearchParams(window.location.search)

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.company) setSelectedCompany(parsed.company)
        if (parsed.period) setSelectedPeriod(parsed.period)
        if (parsed.status) setSelectedStatus(parsed.status)
      } catch {
        // noop
      }
    }

    const companyParam = urlParams.get('companyId')
    const periodParam = urlParams.get('period')
    const statusParam = urlParams.get('status')

    if (companyParam) setSelectedCompany(companyParam)
    if (periodParam) setSelectedPeriod(periodParam)
    if (statusParam) setSelectedStatus(statusParam)

    setFiltersLoaded(true)
  }, [])

  useEffect(() => {
    const fetchCompanies = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch('/api/companies', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await response.json()

        if (data.success) {
          setCompanies(data.data)
        }
      } catch (error) {
        console.error('Error fetching companies:', error)
      }
    }

    fetchCompanies()
  }, [])

  useEffect(() => {
    if (!filtersLoaded) return

    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        company: selectedCompany,
        period: selectedPeriod,
        status: selectedStatus,
      })
    )

    const params = new URLSearchParams()
    if (selectedCompany !== 'all') params.set('companyId', selectedCompany)
    if (selectedStatus !== 'all') params.set('status', selectedStatus)
    if (selectedPeriod) params.set('period', selectedPeriod)
    const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersLoaded, selectedCompany, selectedPeriod, selectedStatus, selectedMethod, searchTerm, currentPage, pageSize])

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      const { startDate, endDate } = getDateRangeByPeriod(selectedPeriod)

      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedMethod !== 'all') params.append('method', selectedMethod)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      params.append('page', currentPage.toString())
      params.append('limit', pageSize.toString())

      const [incomesRes, summaryRes] = await Promise.all([
        fetch(`/api/incomes?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/incomes/summary?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const incomesData = await incomesRes.json()
      const summaryData = await summaryRes.json()

      if (incomesData.success) {
        setIncomes(incomesData.data.data)
        setTotalPages(incomesData.data.pagination.totalPages)
      }

      if (summaryData.success) {
        setSummary(summaryData.data)
      }

      // Pre-cargar datos de la empresa para impresión
      const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
      if (activeCompany.id) {
        const res = await fetch(`/api/companies/${activeCompany.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) {
          setIncomes(prev => prev.map(inc => ({
            ...inc,
            companyLogo: data.data.logo,
            companyInvoiceHeader: data.data.invoiceHeaderHtml,
            companyInvoiceFooter: data.data.invoiceFooterHtml,
            companyInvoiceColor: data.data.invoicePrimaryColor,
            companyIndustry: data.data.industry
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching incomes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    if (!incomes.length) {
      alert('No hay datos para exportar')
      return
    }

    setIsExporting(true)
    try {
      const rows = incomes.map(i => ({
        Empresa: i.company,
        Fecha: new Date(i.date).toLocaleDateString('es-ES'),
        Referencia: i.refNumber,
        Cliente: i.client,
        Concepto: i.concept,
        Metodo: i.method,
        Monto: i.amount,
        Margen: i.margin,
        Estado: i.status === 'PAID' ? 'Pagado' : i.status === 'PENDING' ? 'Pendiente' : i.status === 'CANCELLED' ? 'Anulado' : 'Error'
      }))

      exportWithCompanyHeader(
        rows,
        `ingresos_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Reporte de Ingresos',
        companies as any,
        selectedCompany
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    setShowImportModal(true)
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      { refNumber: 'REF-001', client: 'Nombre del Cliente', concept: 'Descripción del servicio', method: 'Transferencia', amount: 1000, margin: 10, status: 'PENDING', date: '2026-01-15' },
      { refNumber: 'REF-002', client: 'Otro Cliente', concept: 'Venta de producto', method: 'Efectivo', amount: 500, margin: 15, status: 'PAID', date: '2026-01-16' },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_ingresos.xlsx')
  }

  const fetchClients = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const companyId = selectedCompany !== 'all' ? selectedCompany : ''
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/clients${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        const names = data.data.map((c: any) => c.name).filter(Boolean)
        setClientsList(names)
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany])

  const resolveDefaultCompanyId = () => {
    if (selectedCompany !== 'all') return selectedCompany
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || companies[0]?.id || ''
  }

  const addInlineRow = () => {
    const companyId = resolveDefaultCompanyId()
    if (!companyId) {
      alert('Selecciona una empresa antes de agregar una fila')
      return
    }

    setDraftRows((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        companyId,
        date: new Date().toISOString().split('T')[0],
        refNumber: '',
        client: '',
        concept: '',
        method: '',
        amount: '',
        currency: 'USD',
        margin: '',
        status: 'PENDING',
      },
    ])
  }

  const updateDraftRow = (
    tempId: number,
    field: keyof IncomeRowDraft,
    value: string
  ) => {
    setDraftRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId ? { ...row, [field]: value } : row
      )
    )
  }

  const updateEditingRow = (
    incomeId: string,
    field: keyof IncomeRowDraft,
    value: string
  ) => {
    setEditingRows((prev) => ({
      ...prev,
      [incomeId]: {
        ...prev[incomeId],
        [field]: value,
      },
    }))
  }

  const startEditingRow = (income: Income) => {
    setEditingRows((prev) => ({
      ...prev,
      [income.id]: {
        tempId: Date.now(),
        sourceId: income.id,
        companyId: income.companyId,
        date: income.date.split('T')[0],
        refNumber: income.refNumber,
        client: income.client,
        concept: income.concept,
        method: income.method,
        amount: String(income.amount),
        currency: 'USD',
        margin: String(income.margin),
        status: income.status,
      },
    }))
  }

  const cancelEditingRow = (incomeId: string) => {
    setEditingRows((prev) => {
      const next = { ...prev }
      delete next[incomeId]
      return next
    })
  }

  const saveRow = async (row: IncomeRowDraft, mode: 'create' | 'update') => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    if (!row.companyId || !row.client || !row.concept || !row.method || row.amount === '' || !row.date) {
      alert('Completa empresa, fecha, cliente, concepto, método y monto')
      return
    }

    const amount = Number(row.amount)
    const margin = Number(row.margin || 0)
    if (!Number.isFinite(amount)) {
      alert('El monto no es válido')
      return
    }

    try {
      const endpoint = mode === 'create' ? '/api/incomes' : `/api/incomes/${row.sourceId}`
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: row.companyId,
          date: row.date,
          refNumber: row.refNumber || `REF-${Date.now()}`,
          client: row.client,
          concept: row.concept,
          method: row.method,
          amount,
          margin: Number.isFinite(margin) ? margin : 0,
          status: row.status,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo guardar el ingreso')
        return
      }

      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        cancelEditingRow(row.sourceId)
      }

      fetchData()
    } catch (error) {
      console.error('Error saving income row:', error)
      alert('Error al guardar el ingreso')
    }
  }

  const deleteIncome = async (incomeId: string) => {
    const confirmed = window.confirm('¿Deseas eliminar este ingreso?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/incomes/${incomeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo eliminar el ingreso')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error deleting income:', error)
      alert('Error al eliminar el ingreso')
    }
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: IncomeRowDraft,
    mode: 'create' | 'update'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveRow(row, mode)
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        deleteIncome(row.sourceId)
      }
    }
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const token = localStorage.getItem('accessToken')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const companyId = selectedCompany !== 'all' ? selectedCompany : activeCompany.id

    if (!token || !companyId) {
      alert('Selecciona una empresa válida antes de importar')
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('companyId', companyId)

      const response = await fetch('/api/incomes/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        alert(`Importación completada. Importados: ${data.data.imported} | Omitidos: ${data.data.skipped}`)
        fetchData()
      } else {
        alert(data.message || data.error || 'No se pudo importar el archivo')
      }
    } catch (error) {
      console.error('Error importing incomes:', error)
      alert('Ocurrió un error al importar ingresos')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      PAID: 'success',
      PENDING: 'warning',
      CANCELLED: 'default',
      ERROR: 'error',
    }
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Anulado',
      ERROR: 'Error',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const handlePrint = (income: Income) => {
    setSelectedPrintIncome(income)
    setTimeout(() => {
      window.print()
      setSelectedPrintIncome(null)
    }, 300)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de facturación y entradas de dinero</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={addInlineRow}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AGREGAR FILA
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {isImporting ? 'IMPORTANDO...' : 'IMPORTAR INGRESOS'}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isExporting ? 'EXPORTANDO...' : 'EXPORTAR INGRESOS'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="INGRESOS TOTALES"
          value={formatCurrency(summary?.totalIncomes || 0)}
          change={summary?.totalGrowth || 0}
          changeLabel="VS MES ANTERIOR"
          trend={summary?.totalGrowth && summary.totalGrowth > 0 ? 'up' : 'down'}
          icon={
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KPICard
          title="INGRESOS PENDIENTES"
          value={formatCurrency(summary?.pendingIncomes || 0)}
          change={summary?.pendingCount || 0}
          changeLabel={`${summary?.pendingCount || 0} facturas`}
          trend="neutral"
          icon={
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KPICard
          title="PROMEDIO DE VENTA"
          value={formatCurrency(summary?.averageSale || 0)}
          change={summary?.averageGrowth || 0}
          changeLabel="VS MES ANTERIOR"
          trend={summary?.averageGrowth && summary.averageGrowth > 0 ? 'up' : 'down'}
          icon={
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 mb-6">
          {/* Primera fila: Buscador y filtros principales */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                placeholder="Buscar por cliente, referencia, concepto..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Select
              options={[
                { value: 'all', label: 'TODAS LAS EMPRESAS' },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setCurrentPage(1) }}
              className="w-48"
            />
            <Select
              options={[
                { value: 'month', label: 'ÚLTIMO MES' },
                { value: 'quarter', label: 'ÚLTIMO TRIMESTRE' },
                { value: 'year', label: 'ÚLTIMO AÑO' },
              ]}
              value={selectedPeriod}
              onChange={(e) => { setSelectedPeriod(e.target.value); setCurrentPage(1) }}
              className="w-48"
            />
          </div>
          {/* Segunda fila: Más filtros y paginación */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Select
                options={[
                  { value: 'all', label: 'TODOS LOS ESTADOS' },
                  { value: 'PAID', label: 'Pagado' },
                  { value: 'PENDING', label: 'Pendiente' },
                  { value: 'CANCELLED', label: 'Anulado' },
                  { value: 'ERROR', label: 'Error' },
                ]}
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1) }}
                className="w-48"
              />
              <Select
                options={[
                  { value: 'all', label: 'TODOS LOS MÉTODOS' },
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Transferencia', label: 'Transferencia' },
                  { value: 'Tarjeta', label: 'Tarjeta' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Importado', label: 'Importado' },
                ]}
                value={selectedMethod}
                onChange={(e) => { setSelectedMethod(e.target.value); setCurrentPage(1) }}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mostrar:</span>
              <Select
                options={[
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '75', label: '75' },
                  { value: '100', label: '100' },
                  { value: '150', label: '150' },
                ]}
                value={pageSize.toString()}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }}
                className="w-20"
              />
              <span className="text-sm text-gray-500">por página</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">FECHA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">N°REF</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONCEPTO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">MÉTODO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">MONTO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">MARGEN</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">FACTURA</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row) => (
                <tr key={row.tempId} className="border-b border-blue-100 bg-blue-50/40">
                  <td className="py-2 px-2">
                    <select
                      value={row.companyId}
                      onChange={(e) => updateDraftRow(row.tempId, 'companyId', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateDraftRow(row.tempId, 'date', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={row.refNumber}
                      onChange={(e) => updateDraftRow(row.tempId, 'refNumber', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="REF-001"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      list="clients-datalist"
                      value={row.client}
                      onChange={(e) => updateDraftRow(row.tempId, 'client', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Cliente"
                    />
                    <datalist id="clients-datalist">
                      {Array.from(new Set([...clientsList, ...incomes.map(i => i.client)])).filter(Boolean).map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={row.concept}
                      onChange={(e) => updateDraftRow(row.tempId, 'concept', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Concepto"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={row.method}
                      onChange={(e) => updateDraftRow(row.tempId, 'method', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Método"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <select
                        value={row.currency}
                        onChange={(e) => updateDraftRow(row.tempId, 'currency', e.target.value)}
                        className="px-1 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                      >
                        <option value="USD">$</option>
                        <option value="NIO">C$</option>
                      </select>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => updateDraftRow(row.tempId, 'amount', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={row.margin}
                      onChange={(e) => updateDraftRow(row.tempId, 'margin', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateDraftRow(row.tempId, 'status', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="PAID">Pagado</option>
                      <option value="PENDING">Pendiente</option>
                      <option value="CANCELLED">Anulado</option>
                      <option value="ERROR">Error</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" onClick={() => saveRow(row, 'create')}>Guardar</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))}
                      >
                        Quitar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {incomes.map((income) => (
                editingRows[income.id] ? (
                  <tr key={income.id} className="border-b border-blue-100 bg-blue-50/30">
                    <td className="py-2 px-2">
                      <select
                        value={editingRows[income.id].companyId}
                        onChange={(e) => updateEditingRow(income.id, 'companyId', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={editingRows[income.id].date}
                        onChange={(e) => updateEditingRow(income.id, 'date', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={editingRows[income.id].refNumber}
                        onChange={(e) => updateEditingRow(income.id, 'refNumber', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={editingRows[income.id].client}
                        onChange={(e) => updateEditingRow(income.id, 'client', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={editingRows[income.id].concept}
                        onChange={(e) => updateEditingRow(income.id, 'concept', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={editingRows[income.id].method}
                        onChange={(e) => updateEditingRow(income.id, 'method', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editingRows[income.id].amount}
                        onChange={(e) => updateEditingRow(income.id, 'amount', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editingRows[income.id].margin}
                        onChange={(e) => updateEditingRow(income.id, 'margin', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={editingRows[income.id].status}
                        onChange={(e) => updateEditingRow(income.id, 'status', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[income.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="PAID">Pagado</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="CANCELLED">Anulado</option>
                        <option value="ERROR">Error</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => saveRow(editingRows[income.id], 'update')}>Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEditingRow(income.id)}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={income.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{income.company}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">
                        {new Date(income.date).toLocaleDateString('es-ES')}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{income.refNumber}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{income.client}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{income.concept}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{income.method}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(income.amount)}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(income.margin)}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(income.status)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => handlePrint(income)}
                        className="text-primary hover:text-primary/70 transition-colors"
                        title="Imprimir Factura"
                      >
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingRow(income)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => deleteIncome(income.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        {incomes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron ingresos
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Mostrando 1 a {incomes.length} de {incomes.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              
              {totalPages > 5 && <span className="text-gray-500">...</span>}
              
              {totalPages > 5 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-8 rounded ${
                    currentPage === totalPages
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {totalPages}
                </button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Importación */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Importar Ingresos</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">📋 Formato del archivo</h4>
                <p className="text-sm text-blue-700 mb-2">El archivo debe ser Excel (.xlsx, .xls) o CSV con las siguientes columnas:</p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                  <li><strong>refNumber</strong> - Número de referencia (ej: REF-001)</li>
                  <li><strong>client</strong> - Nombre del cliente</li>
                  <li><strong>concept</strong> - Descripción del ingreso</li>
                  <li><strong>method</strong> - Método de pago (Transferencia, Efectivo, etc.)</li>
                  <li><strong>amount</strong> - Monto (número)</li>
                  <li><strong>margin</strong> - Margen % (número)</li>
                  <li><strong>status</strong> - Estado: PAID, PENDING, CANCELLED</li>
                  <li><strong>date</strong> - Fecha (YYYY-MM-DD)</li>
                </ul>
              </div>

              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Plantilla de Ejemplo
              </Button>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    handleImportFile(e)
                    setShowImportModal(false)
                  }}
                />
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? 'Importando...' : 'Seleccionar Archivo'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">Formatos: .xlsx, .xls, .csv</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Importante:</strong> Asegúrate de seleccionar la empresa correcta antes de importar. 
                  Los ingresos se asignarán a la empresa actualmente seleccionada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRINT LAYOUT (Factura) ===== */}
      {selectedPrintIncome && (
        <div id="invoice-print" className="fixed inset-0 bg-white z-[9999] p-8 font-sans text-sm text-gray-900 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #invoice-print, #invoice-print * { visibility: visible !important; }
              #invoice-print { position: absolute !important; top: 0; left: 0; width: 100%; margin: 0; padding: 20px; }
            }
          `}</style>
          
          <div className="flex items-start justify-between mb-8">
            <div>
              {selectedPrintIncome.companyLogo ? (
                <img src={selectedPrintIncome.companyLogo} alt="Logo" className="h-16 object-contain mb-2" />
              ) : (
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: selectedPrintIncome.companyInvoiceColor || '#1d4ed8' }}
                >
                  {selectedPrintIncome.company}
                </div>
              )}
              {selectedPrintIncome.companyIndustry && (
                <div className="text-xs text-gray-500 italic mb-2">{selectedPrintIncome.companyIndustry}</div>
              )}
              {selectedPrintIncome.companyInvoiceHeader && (
                <div 
                  className="text-[10px] text-gray-600 mt-2 max-w-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: selectedPrintIncome.companyInvoiceHeader }}
                />
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-gray-800 tracking-wider">FACTURA</div>
              <div className="text-lg font-bold text-gray-600 mt-1">N° {selectedPrintIncome.refNumber}</div>
              <div className="mt-4 text-xs">
                <div className="flex justify-end gap-4">
                  <span className="font-semibold text-gray-500 uppercase">FECHA DE EMISIÓN</span>
                  <span>{new Date(selectedPrintIncome.date).toLocaleDateString('es-NI')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">FACTURAR A</div>
              <div className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2 mb-2">
                {selectedPrintIncome.client.toUpperCase()}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-semibold">Estado:</span> {selectedPrintIncome.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}</p>
                <p><span className="font-semibold">Método de Pago:</span> {selectedPrintIncome.method}</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">RESUMEN DE PAGO</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Monto Total:</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {formatCurrency(selectedPrintIncome.amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse mb-8">
            <thead>
              <tr 
                className="text-white text-[10px] uppercase tracking-wider"
                style={{ backgroundColor: selectedPrintIncome.companyInvoiceColor || '#1d4ed8' }}
              >
                <th className="px-4 py-3 text-left font-bold rounded-tl-lg">DESCRIPCIÓN / CONCEPTO</th>
                <th className="px-4 py-3 text-right font-bold rounded-tr-lg">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-6 text-sm text-gray-800">
                  {selectedPrintIncome.concept}
                </td>
                <td className="px-4 py-6 text-right text-base font-bold text-gray-900">
                  {formatCurrency(selectedPrintIncome.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-12 pt-8">
            <div>
              {selectedPrintIncome.companyInvoiceFooter && (
                <>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NOTAS ADICIONALES</div>
                  <div 
                    className="text-[10px] text-gray-500 whitespace-pre-wrap pb-4 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedPrintIncome.companyInvoiceFooter }}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col items-center justify-end">
              <div className="w-48 border-t border-gray-300 pt-2 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">FIRMA AUTORIZADA</div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center border-t border-gray-100 pt-4">
            <p className="text-[9px] text-gray-400 italic">
              Este documento es una representación impresa de un ingreso registrado en Kosmos CRM.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
