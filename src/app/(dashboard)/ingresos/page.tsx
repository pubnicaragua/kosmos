'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [draftRows, setDraftRows] = useState<IncomeRowDraft[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, IncomeRowDraft>>({})
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
  }, [filtersLoaded, selectedCompany, selectedPeriod, selectedStatus, currentPage])

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      const { startDate, endDate } = getDateRangeByPeriod(selectedPeriod)

      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      params.append('page', currentPage.toString())
      params.append('limit', '10')

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
    } catch (error) {
      console.error('Error fetching incomes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      const { startDate, endDate } = getDateRangeByPeriod(selectedPeriod)

      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('startDate', startDate)
      params.append('endDate', endDate)

      const response = await fetch(`/api/incomes/export?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (!data.success) return

      const rows = data.data.data as Array<Record<string, unknown>>
      if (!rows || rows.length === 0) {
        alert('No hay ingresos para exportar con los filtros actuales')
        return
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Ingresos')
      XLSX.writeFile(workbook, `ingresos_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting incomes:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select
              options={[
                { value: 'all', label: 'TODAS LAS EMPRESAS' },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-56"
            />
            <Select
              options={[
                { value: 'month', label: 'ÚLTIMO MES' },
                { value: 'quarter', label: 'ÚLTIMO TRIMESTRE' },
                { value: 'year', label: 'ÚLTIMO AÑO' },
              ]}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-56"
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'TODOS LOS ESTADOS' },
              { value: 'PAID', label: 'Pagado' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'CANCELLED', label: 'Anulado' },
              { value: 'ERROR', label: 'Error' },
            ]}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-56"
          />
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
                      value={row.client}
                      onChange={(e) => updateDraftRow(row.tempId, 'client', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Cliente"
                    />
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
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => updateDraftRow(row.tempId, 'amount', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                      placeholder="0"
                    />
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
    </div>
  )
}
