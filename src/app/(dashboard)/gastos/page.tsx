'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import * as XLSX from 'xlsx'

interface Expense {
  id: string
  company: string
  date: string
  refNumber: string
  provider: string
  concept: string
  category: string
  method: string
  amount: number
  status: 'PAID' | 'PENDING' | 'CANCELLED'
}

interface ExpenseSummary {
  totalExpenses: number
  totalGrowth: number
  paidExpenses: number
  pendingExpenses: number
  pendingCount: number
}

interface Company {
  id: string
  name: string
  logo: string | null
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (typeof window === 'undefined') return 'all'
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || 'all'
  })
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    provider: '',
    concept: '',
    category: 'Operaciones',
    method: 'Transferencia',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    status: 'PENDING' as const,
  })

  const getPeriodRange = (period: string) => {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    const startDate = new Date(endDate)
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3)
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1)
    }
    startDate.setHours(0, 0, 0, 0)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  const fetchCompanies = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const listParams = new URLSearchParams()
      const summaryParams = new URLSearchParams()
      const { startDate, endDate } = getPeriodRange(selectedPeriod)

      if (selectedCompany !== 'all') {
        listParams.append('companyId', selectedCompany)
        summaryParams.append('companyId', selectedCompany)
      }
      if (selectedStatus !== 'all') listParams.append('status', selectedStatus)
      if (selectedProvider !== 'all') listParams.append('provider', selectedProvider)

      listParams.append('startDate', startDate)
      listParams.append('endDate', endDate)
      listParams.append('page', currentPage.toString())
      listParams.append('limit', '10')

      summaryParams.append('startDate', startDate)
      summaryParams.append('endDate', endDate)

      const [expensesRes, summaryRes] = await Promise.all([
        fetch(`/api/expenses?${listParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/expenses/summary?${summaryParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const expensesData = await expensesRes.json()
      const summaryData = await summaryRes.json()

      if (expensesData.success) {
        setExpenses(expensesData.data.data)
        setTotalPages(expensesData.data.pagination.totalPages)
        setTotalItems(expensesData.data.pagination.total)
      }

      if (summaryData.success) {
        setSummary(summaryData.data)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedPeriod, selectedStatus, selectedProvider, currentPage])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedPeriod, selectedStatus, selectedProvider])

  const handleExport = () => {
    if (!expenses.length) {
      alert('No hay gastos para exportar')
      return
    }
    const rows = expenses.map((e) => ({
      Empresa: e.company,
      Fecha: new Date(e.date).toLocaleDateString('es-ES'),
      'N° Ref': e.refNumber,
      Proveedor: e.provider,
      Concepto: e.concept,
      Categoría: e.category,
      Método: e.method,
      Monto: e.amount,
      Estado: e.status,
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Gastos')
    XLSX.writeFile(workbook, `gastos_${Date.now()}.xlsx`)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const companyId = selectedCompany !== 'all' ? selectedCompany : JSON.parse(localStorage.getItem('activeCompany') || '{}').id
    if (!companyId) {
      alert('Selecciona una empresa')
      return
    }
    const activeCompany = { id: companyId }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          companyId: activeCompany.id || companyId,
        }),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchData()
        setFormData({
          provider: '',
          concept: '',
          category: 'Operaciones',
          method: 'Transferencia',
          amount: '',
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          status: 'PENDING',
        })
      }
    } catch (error) {
      console.error('Error creating expense:', error)
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
    const variants: Record<string, 'success' | 'warning' | 'default'> = {
      PAID: 'success',
      PENDING: 'warning',
      CANCELLED: 'default',
    }
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Anulado',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * 10 + 1
  const showingTo = totalItems === 0 ? 0 : Math.min(currentPage * 10, totalItems)

  const visiblePages = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages = new Set<number>([1, totalPages])
    pages.add(currentPage)
    if (currentPage - 1 > 1) pages.add(currentPage - 1)
    if (currentPage + 1 < totalPages) pages.add(currentPage + 1)

    return Array.from(pages).sort((a, b) => a - b)
  })()

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
          <h1 className="text-2xl font-semibold text-gray-900">Gastos Operativos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona y visualiza el historial de gastos operativos de la empresa.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR GASTOS
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            NUEVO GASTO
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="GASTOS TOTALES"
          value={formatCurrency(summary?.totalExpenses || 0)}
          change={summary?.totalGrowth || 0}
          changeLabel="VS PERIODO ANTERIOR"
          trend={summary?.totalGrowth && summary.totalGrowth > 0 ? 'down' : 'up'}
          icon={
            <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KPICard
          title="PAGADOS"
          value={formatCurrency(summary?.paidExpenses || 0)}
          icon={
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KPICard
          title="PENDIENTES"
          value={formatCurrency(summary?.pendingExpenses || 0)}
          change={summary?.pendingCount || 0}
          changeLabel={`${summary?.pendingCount || 0} facturas`}
          trend="neutral"
          icon={
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            TODAS
          </button>
          <button
            onClick={() => setSelectedStatus('PAID')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'PAID'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PAGADO
          </button>
          <button
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'PENDING'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PENDIENTE
          </button>
          <button
            onClick={() => setSelectedStatus('CANCELLED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'CANCELLED'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ANULADO
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Select
              options={[
                { value: 'all', label: 'TODOS LOS PROVEEDORES' },
                ...Array.from(new Set(expenses.map((e) => e.provider).filter(Boolean))).map((p) => ({ value: p, label: p })),
              ]}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-52"
            />
            <Button variant="outline" size="sm" onClick={() => { setSelectedStatus('all'); setSelectedProvider('all') }}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              LIMPIAR FILTROS
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">FECHA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">PROVEEDOR</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONCEPTO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CATEGORÍA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">MÉTODO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">MONTO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{expense.company}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{expense.provider}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{expense.concept}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{expense.category}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{expense.method}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(expense.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron gastos
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              MOSTRANDO {showingFrom} A {showingTo} DE {totalItems} RESULTADOS
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1]
                const hasGap = previousPage && page - previousPage > 1

                return (
                  <div key={page} className="flex items-center gap-2">
                    {hasGap && <span className="text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded ${
                        currentPage === page ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Gasto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <input
              list="providers-list"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
              placeholder="Buscar o escribir proveedor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="providers-list">
              {Array.from(new Set(expenses.map(e => e.provider).filter(Boolean))).map(p => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <Input
            label="Concepto"
            value={formData.concept}
            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
            required
            fullWidth
          />
          <Select
            label="Categoría"
            options={[
              { value: 'Operaciones', label: 'Operaciones' },
              { value: 'Nómina', label: 'Nómina' },
              { value: 'Alquiler', label: 'Alquiler' },
              { value: 'Servicios Públicos', label: 'Servicios Públicos' },
              { value: 'Soporte Técnico', label: 'Soporte Técnico' },
              { value: 'Marketing', label: 'Marketing' },
              { value: 'Logística', label: 'Logística' },
              { value: 'Impuestos', label: 'Impuestos' },
              { value: 'Mantenimiento', label: 'Mantenimiento' },
              { value: 'Viáticos', label: 'Viáticos' },
              { value: 'Otro', label: 'Otro' },
            ]}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            fullWidth
          />
          <Select
            label="Método de Pago"
            options={[
              { value: 'Transferencia', label: 'Transferencia Bancaria' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Tarjeta Crédito', label: 'Tarjeta de Crédito' },
              { value: 'Tarjeta Débito', label: 'Tarjeta de Débito' },
              { value: 'Depósito', label: 'Depósito Bancario' },
            ]}
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
            fullWidth
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <div className="flex gap-2">
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="USD">$ USD</option>
                <option value="NIO">C$ NIO</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            fullWidth
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Gasto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
