'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { SkeletonDashboard } from '@/components/ui-kit/Skeleton'
import { Badge } from '@/components/ui-kit/Badge'
import { Modal } from '@/components/ui-kit/Modal'
import { Checkbox } from '@/components/ui-kit/Checkbox'
import * as XLSX from 'xlsx'
import { Activity, Users, DollarSign, BarChart3, TrendingUp, Settings, FileText, CheckCircle2, Megaphone, Target, Briefcase } from 'lucide-react'

interface DashboardData {
  kpis: {
    totalSales: number
    salesGrowth: number
    operationalExpenses: number
    expensesChange: number
    pipelineValue: number
    pipelineChange: number
    activeClients: number
    clientsGrowth: number
    newClientsThisPeriod?: number
    ticketResolutionRate: number
    activeContracts: number
    marketingBudget: number
    marketingSpent: number
    marketingRoi: number
    wonValue: number
    wonCount: number
    lostCount: number
  }
  monthlyData: Array<{
    month: string
    incomes: number
    expenses: number
  }>
  performanceByCompany: Array<{
    company: string
    industry?: string
    sales: number
    growth: number
    status: string
  }>
}

export default function DashboardsPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('quarter')
  const [companies, setCompanies] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [visibleKpis, setVisibleKpis] = useState<string[]>([
    'totalSales', 'operationalExpenses', 'pipelineValue', 'activeClients'
  ])

  // Persistir configuración de KPIs
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_kpis')
    if (saved) {
      try {
        setVisibleKpis(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading KPI config')
      }
    }
  }, [])

  const toggleKpi = (kpi: string) => {
    const next = visibleKpis.includes(kpi) 
      ? visibleKpis.filter(k => k !== kpi)
      : [...visibleKpis, kpi]
    setVisibleKpis(next)
    localStorage.setItem('dashboard_kpis', JSON.stringify(next))
  }

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

  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setError('No hay sesion activa')
      setIsLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      const { startDate, endDate } = getDateRangeByPeriod(selectedPeriod)

      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      params.append('startDate', startDate)
      params.append('endDate', endDate)

      const response = await fetch(`/api/dashboard/summary?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudieron cargar los datos del dashboard')
      }

      setData(result.data)
      setError('')
    } catch (fetchError) {
      console.error('Error fetching dashboard data:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Error al cargar dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedPeriod])

  useEffect(() => {
    const fetchCompanies = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setError('No hay sesion activa')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/companies', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const result = await response.json()

        if (result.success) {
          setCompanies(result.data)

          const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
          if (activeCompany?.id && result.data.some((company: any) => company.id === activeCompany.id)) {
            setSelectedCompany(activeCompany.id)
          }
        }
      } catch (fetchError) {
        console.error('Error fetching companies:', fetchError)
        setError('No se pudieron cargar las empresas')
      }
    }

    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value)
  }

  const handleExportReport = () => {
    const selectedCompanyName =
      selectedCompany === 'all'
        ? 'Todas las empresas'
        : companies.find((company) => company.id === selectedCompany)?.name || 'Empresa'

    const periodLabel = selectedPeriod === 'month' ? 'Este mes' : selectedPeriod === 'quarter' ? 'Este trimestre' : 'Este ano'
    const generatedAt = new Date().toLocaleString('es-ES')

    const summaryRows = [
      { Campo: 'Empresa', Valor: selectedCompanyName },
      { Campo: 'Periodo', Valor: periodLabel },
      { Campo: 'Generado', Valor: generatedAt },
      { Campo: 'Ventas Totales', Valor: data?.kpis.totalSales || 0 },
      { Campo: 'Crecimiento Ventas (%)', Valor: Number((data?.kpis.salesGrowth || 0).toFixed(2)) },
      { Campo: 'Gastos Operativos', Valor: data?.kpis.operationalExpenses || 0 },
      { Campo: 'Variacion Gastos (%)', Valor: Number((data?.kpis.expensesChange || 0).toFixed(2)) },
      { Campo: 'Pipeline', Valor: data?.kpis.pipelineValue || 0 },
      { Campo: 'Clientes Activos', Valor: data?.kpis.activeClients || 0 },
    ]

    const monthlyRows = (data?.monthlyData || []).map((row) => ({
      Mes: row.month,
      Ingresos: row.incomes,
      Gastos: row.expenses,
    }))

    const companyRows = (data?.performanceByCompany || []).map((row) => ({
      Empresa: row.company,
      Ventas: row.sales,
      Crecimiento: Number(row.growth.toFixed(2)),
      Estado: row.status,
    }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Resumen')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), 'Ingresos vs Gastos')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(companyRows), 'Empresas')

    XLSX.writeFile(
      workbook,
      `informe-dashboard-${selectedCompanyName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const chartRows = useMemo(
    () =>
      (data?.monthlyData || []).map((row) => {
        const [year, month] = row.month.split('-').map(Number)
        const monthDate = Number.isFinite(year) && Number.isFinite(month) ? new Date(year, (month || 1) - 1, 1) : new Date()
        const label = monthDate.toLocaleDateString('es-ES', { month: 'short' })

        return {
          ...row,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        }
      }),
    [data?.monthlyData]
  )

  const maxChartValue = chartRows.reduce((max, row) => Math.max(max, row.incomes, row.expenses), 0) || 1

  const handleSearchClients = () => {
    if (searchQuery.trim()) {
      router.push(`/clientes?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleKpiDrillDown = (basePath: string) => {
    const params = new URLSearchParams()
    if (selectedCompany !== 'all') params.set('companyId', selectedCompany)
    params.set('period', selectedPeriod)
    const query = params.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  // Generar datos para sparklines
  const salesTrend = useMemo(() => (data?.monthlyData || []).map(d => ({ value: d.incomes })), [data?.monthlyData])
  const expensesTrend = useMemo(() => (data?.monthlyData || []).map(d => ({ value: d.expenses })), [data?.monthlyData])
  const clientsTrend = useMemo(() => (data?.monthlyData || []).map(d => ({ value: Math.random() * 10 + 5 })), [data?.monthlyData]) // Mock trend for clients
  const pipelineTrendData = useMemo(() => (data?.monthlyData || []).map(d => ({ value: d.incomes * 1.5 })), [data?.monthlyData]) // Mock trend based on income

  if (isLoading) {
    return <SkeletonDashboard />
  }

  const pipelineChange = data?.kpis.pipelineChange || 0
  const pipelineTrend = pipelineChange > 0 ? 'up' : pipelineChange < 0 ? 'down' : 'neutral'
  const pipelineLabel = pipelineChange === 0 ? 'SIN CAMBIOS' : 'VS PERIODO ANTERIOR'
  const chartSubtitle =
    selectedPeriod === 'month'
      ? 'Comparativa mensual consolidada'
      : selectedPeriod === 'quarter'
      ? 'Comparativa trimestral consolidada'
      : 'Comparativa anual consolidada'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Resumen Ejecutivo</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Actualización en tiempo real • {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsConfigModalOpen(true)}>
            <Settings className="w-5 h-5 mr-2" />
            CONFIGURAR
          </Button>
          <Button onClick={handleExportReport} className="bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR INFORME
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClients()}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <Button onClick={handleSearchClients} variant="outline">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Button>
        </div>
        <Select
          options={[{ value: 'all', label: 'TODAS LAS EMPRESAS' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-64"
        />
        <Select
          options={[
            { value: 'month', label: 'ESTE MES' },
            { value: 'quarter', label: 'ESTE TRIMESTRE' },
            { value: 'year', label: 'ESTE ANO' },
          ]}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-64"
        />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleKpis.includes('totalSales') && (
          <div onClick={() => handleKpiDrillDown('/ingresos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="VENTAS TOTALES"
              value={formatCurrency(data?.kpis.totalSales || 0)}
              change={data?.kpis.salesGrowth || 0}
              changeLabel="VS PERIODO ANTERIOR"
              trend={data?.kpis.salesGrowth && data.kpis.salesGrowth > 0 ? 'up' : 'down'}
              icon={<DollarSign className="w-6 h-6 text-success" />}
              sparklineData={salesTrend}
            />
          </div>
        )}

        {visibleKpis.includes('operationalExpenses') && (
          <div onClick={() => handleKpiDrillDown('/gastos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="GASTOS OPERATIVOS"
              value={formatCurrency(data?.kpis.operationalExpenses || 0)}
              change={data?.kpis.expensesChange || 0}
              changeLabel="VS PERIODO ANTERIOR"
              trend={data?.kpis.expensesChange && data.kpis.expensesChange < 0 ? 'up' : 'down'}
              icon={<BarChart3 className="w-6 h-6 text-error" />}
              sparklineData={expensesTrend}
            />
          </div>
        )}

        {visibleKpis.includes('pipelineValue') && (
          <div onClick={() => handleKpiDrillDown('/pipeline-ventas')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="VALOR PIPELINE"
              value={formatCurrency(data?.kpis.pipelineValue || 0)}
              change={pipelineChange}
              changeLabel={pipelineLabel}
              trend={pipelineTrend}
              icon={<TrendingUp className="w-6 h-6 text-primary" />}
              sparklineData={pipelineTrendData}
            />
          </div>
        )}

        {visibleKpis.includes('activeClients') && (
          <div onClick={() => handleKpiDrillDown('/clientes')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="CLIENTES ACTIVOS"
              value={formatNumber(data?.kpis.activeClients || 0)}
              change={data?.kpis.clientsGrowth || 0}
              changeLabel={`${data?.kpis.newClientsThisPeriod || 0} NUEVOS EN PERIODO`}
              trend={data?.kpis.clientsGrowth && data.kpis.clientsGrowth > 0 ? 'up' : 'neutral'}
              icon={<Users className="w-6 h-6 text-primary" />}
              sparklineData={clientsTrend}
            />
          </div>
        )}

        {visibleKpis.includes('ticketResolutionRate') && (
          <div onClick={() => handleKpiDrillDown('/tickets-soporte')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="% RESOLUCIÓN TICKETS"
              value={`${(data?.kpis.ticketResolutionRate || 0).toFixed(1)}%`}
              change={0}
              changeLabel="TASA DE RESPUESTA"
              trend="neutral"
              icon={<CheckCircle2 className="w-6 h-6 text-success" />}
              sparklineData={salesTrend.map(v => ({ value: v.value * 0.8 }))} // Mock
            />
          </div>
        )}

        {visibleKpis.includes('marketingRoi') && (
          <div onClick={() => handleKpiDrillDown('/marketing')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="ROI MARKETING"
              value={`${(data?.kpis.marketingRoi || 0).toFixed(1)}x`}
              change={0}
              changeLabel={`GASTO: $${data?.kpis.marketingSpent.toLocaleString()}`}
              trend="up"
              icon={<Megaphone className="w-6 h-6 text-indigo-500" />}
              sparklineData={salesTrend.map(v => ({ value: v.value * 0.1 }))} // Mock
            />
          </div>
        )}

        {visibleKpis.includes('wonValue') && (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="NEGOCIOS GANADOS"
              value={formatCurrency(data?.kpis.wonValue || 0)}
              change={0}
              changeLabel={`${data?.kpis.wonCount || 0} CIERRES EXITOSOS`}
              trend="up"
              icon={<Target className="w-6 h-6 text-success" />}
              sparklineData={salesTrend}
            />
          </div>
        )}

        {visibleKpis.includes('activeContracts') && (
          <div onClick={() => handleKpiDrillDown('/contratos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="CONTRATOS ACTIVOS"
              value={formatNumber(data?.kpis.activeContracts || 0)}
              change={0}
              changeLabel="VIGENCIA ACTUAL"
              trend="neutral"
              icon={<Briefcase className="w-6 h-6 text-slate-700" />}
              sparklineData={clientsTrend}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">INGRESOS VS GASTOS</h3>
              <p className="text-sm text-gray-500">{chartSubtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-sm text-gray-600">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <span className="text-sm text-gray-600">Gastos</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {chartRows.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                No hay datos para el periodo seleccionado
              </div>
            ) : (
              chartRows.map((row) => (
                <div key={row.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex gap-1">
                    <div
                      className="flex-1 bg-success rounded-t"
                      style={{ height: `${Math.max((row.incomes / maxChartValue) * 220, 4)}px` }}
                    ></div>
                    <div
                      className="flex-1 bg-error rounded-t"
                      style={{ height: `${Math.max((row.expenses / maxChartValue) * 220, 4)}px` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{row.label}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">RENDIMIENTO POR EMPRESA</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            {(data?.performanceByCompany || []).length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                No hay datos de rendimiento por empresa para este periodo.
              </div>
            ) : (
              data?.performanceByCompany.slice(0, 4).map((company, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{company.company}</span>
                        <Badge
                          variant={
                            company.status === 'positive'
                              ? 'success'
                              : company.status === 'negative'
                              ? 'error'
                              : 'info'
                          }
                        >
                          <div className="w-2 h-2 rounded-full bg-current"></div>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{company.industry || 'Sin industria'}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(company.sales)}</span>
                          <span
                            className={`text-xs ${
                              company.growth > 0
                                ? 'text-success'
                                : company.growth < 0
                                ? 'text-error'
                                : 'text-gray-500'
                            }`}
                          >
                            {company.growth > 0 ? '+' : company.growth < 0 ? '-' : '='}
                            {Math.abs(company.growth).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configurar KPIs del Dashboard"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">Selecciona los indicadores que deseas visualizar en tu resumen ejecutivo.</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'totalSales', label: 'Ventas Totales' },
              { id: 'operationalExpenses', label: 'Gastos Operativos' },
              { id: 'pipelineValue', label: 'Valor Pipeline' },
              { id: 'activeClients', label: 'Clientes Activos' },
              { id: 'ticketResolutionRate', label: 'Tasa Resolución Tickets' },
              { id: 'marketingRoi', label: 'ROI Marketing' },
              { id: 'wonValue', label: 'Valor Negocios Ganados' },
              { id: 'activeContracts', label: 'Contratos Activos' },
            ].map((kpi) => (
              <label key={kpi.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <Checkbox
                  checked={visibleKpis.includes(kpi.id)}
                  onCheckedChange={() => toggleKpi(kpi.id)}
                />
                <span className="text-sm font-medium text-gray-700">{kpi.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <Button onClick={() => setIsConfigModalOpen(false)}>
              GUARDAR CONFIGURACIÓN
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </div>
  )
}
