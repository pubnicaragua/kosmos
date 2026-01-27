'use client'

import { useState, useEffect } from 'react'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface Income {
  id: string
  company: string
  refNumber: string
  client: string
  concept: string
  method: string
  amount: number
  margin: number
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'ERROR'
  date: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchData()
  }, [selectedCompany, selectedPeriod, selectedStatus, currentPage])

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando...</div>
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
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            IMPORTAR INGRESOS
          </Button>
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR INGRESOS
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select
              options={[
                { value: 'all', label: 'TODAS LAS EMPRESAS' },
                { value: 'company1', label: 'Tech Solutions' },
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
          <Button variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            TODOS LOS ESTADOS
          </Button>
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
              </tr>
            </thead>
            <tbody>
              {incomes.map((income) => (
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
                </tr>
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
