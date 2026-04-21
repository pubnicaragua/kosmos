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

    const periodLabel = selectedPeriod === 'month' ? 'Este mes' : selectedPeriod === 'quarter' ? 'Este trimestre' : 'Este año'
    const generatedAt = new Date().toLocaleString('es-ES')

    const workbook = XLSX.utils.book_new()

    // HOJA 1: RESUMEN EJECUTIVO con formato profesional
    const summaryData = [
      ['INFORME DE DASHBOARD EJECUTIVO'],
      [''],
      ['Empresa:', selectedCompanyName],
      ['Período:', periodLabel],
      ['Fecha de generación:', generatedAt],
      [''],
      ['INDICADORES CLAVE DE RENDIMIENTO (KPIs)'],
      [''],
      ['Métrica', 'Valor', 'Variación %'],
      ['Ventas Totales', data?.kpis.totalSales || 0, (data?.kpis.salesGrowth || 0).toFixed(2) + '%'],
      ['Gastos Operativos', data?.kpis.operationalExpenses || 0, (data?.kpis.expensesChange || 0).toFixed(2) + '%'],
      ['Valor Pipeline', data?.kpis.pipelineValue || 0, (data?.kpis.pipelineChange || 0).toFixed(2) + '%'],
      ['Clientes Activos', data?.kpis.activeClients || 0, (data?.kpis.clientsGrowth || 0).toFixed(2) + '%'],
      ['Nuevos Clientes', data?.kpis.newClientsThisPeriod || 0, ''],
      ['Contratos Activos', data?.kpis.activeContracts || 0, ''],
      ['Tasa Resolución Tickets', (data?.kpis.ticketResolutionRate || 0).toFixed(1) + '%', ''],
      ['ROI Marketing', (data?.kpis.marketingRoi || 0).toFixed(2) + 'x', ''],
      ['Presupuesto Marketing', data?.kpis.marketingBudget || 0, ''],
      ['Gasto Marketing', data?.kpis.marketingSpent || 0, ''],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, ws1, 'Resumen Ejecutivo')

    // HOJA 2: INGRESOS VS GASTOS con totales
    const monthlyData = [
      ['ANÁLISIS MENSUAL DE INGRESOS Y GASTOS'],
      [''],
      ['Mes', 'Ingresos ($)', 'Gastos ($)', 'Balance ($)', 'Margen (%)'],
    ]
    let totalIngresos = 0
    let totalGastos = 0
    ;(data?.monthlyData || []).forEach((row) => {
      const ingresos = row.incomes || 0
      const gastos = row.expenses || 0
      const balance = ingresos - gastos
      const margen = ingresos > 0 ? ((balance / ingresos) * 100).toFixed(2) : '0'
      totalIngresos += ingresos
      totalGastos += gastos
      monthlyData.push([row.month, ingresos.toString(), gastos.toString(), balance.toString(), margen + '%'])
    })
    monthlyData.push([''])
    monthlyData.push(['TOTALES', totalIngresos.toString(), totalGastos.toString(), (totalIngresos - totalGastos).toString(), totalIngresos > 0 ? (((totalIngresos - totalGastos) / totalIngresos) * 100).toFixed(2) + '%' : '0%'])
    const ws2 = XLSX.utils.aoa_to_sheet(monthlyData)
    ws2['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, ws2, 'Ingresos vs Gastos')

    // HOJA 3: RENDIMIENTO POR EMPRESA
    const companyData = [
      ['RENDIMIENTO POR EMPRESA'],
      [''],
      ['Empresa', 'Industria', 'Ventas ($)', 'Crecimiento (%)', 'Estado'],
    ]
    ;(data?.performanceByCompany || []).forEach((row) => {
      companyData.push([
        row.company,
        row.industry || 'N/A',
        (row.sales || 0).toString(),
        (row.growth || 0).toFixed(2) + '%',
        row.status === 'positive' ? 'Positivo' : row.status === 'negative' ? 'Negativo' : 'Neutral'
      ])
    })
    const ws3 = XLSX.utils.aoa_to_sheet(companyData)
    ws3['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, ws3, 'Rendimiento Empresas')

    const fileName = `Dashboard_${selectedCompanyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

const chartRows = useMemo(() => {
    const arr = data?.monthlyData
    if (!arr || !Array.isArray(arr)) {
      return []
    }
    return arr.map((row: any) => {
      const monthStr = row?.month || ''
      const parts = monthStr.split('-').map(Number)
      const year = parts[0]
      const month = parts[1]
      const monthDate = Number.isFinite(year) && Number.isFinite(month) ? new Date(year, (month || 1) - 1, 1) : new Date()
      const label = monthDate.toLocaleDateString('es-ES', { month: 'short' })

      return {
        ...row,
        incomes: Number(row?.incomes) || 0,
        expenses: Number(row?.expenses) || 0,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      }
    })
  }, [data?.monthlyData])

  const maxChartValue = useMemo(() => {
    if (!chartRows || !Array.isArray(chartRows) || chartRows.length === 0) {
      return 1
    }
    return chartRows.reduce((max: number, row: any) => Math.max(max, row.incomes || 0, row.expenses || 0), 0) || 1
  }, [chartRows])

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

// Generar datos para sparklines - asegurar que siempre sean arrays válidos
  const salesTrend = useMemo(() => {
    const arr = data?.monthlyData
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return [{ value: 0 }]
    }
    return arr.map(d => ({ value: Number(d.incomes) || 0 }))
  }, [data?.monthlyData])

  const expensesTrend = useMemo(() => {
    const arr = data?.monthlyData
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return [{ value: 0 }]
    }
    return arr.map(d => ({ value: Number(d.expenses) || 0 }))
  }, [data?.monthlyData])

  const clientsTrend = useMemo(() => {
    const arr = data?.monthlyData
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return [{ value: 5 }]
    }
    return arr.map(() => ({ value: Math.random() * 10 + 5 }))
  }, [data?.monthlyData])

  const pipelineTrendData = useMemo(() => {
    const arr = data?.monthlyData
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return [{ value: 0 }]
    }
    return arr.map(d => ({ value: Number(d.incomes) * 1.5 || 0 }))
  }, [data?.monthlyData])

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
              value={formatCurrency(Number(data?.kpis?.totalSales) || 0)}
              change={Number(data?.kpis?.salesGrowth) || 0}
              changeLabel="VS PERIODO ANTERIOR"
              trend={(data?.kpis?.salesGrowth || 0) > 0 ? 'up' : 'down'}
              icon={<DollarSign className="w-6 h-6 text-success" />}
              sparklineData={Array.isArray(salesTrend) ? salesTrend : [{ value: 0 }]}
            />
          </div>
        )}

        {visibleKpis.includes('operationalExpenses') && (
          <div onClick={() => handleKpiDrillDown('/gastos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="GASTOS OPERATIVOS"
              value={formatCurrency(Number(data?.kpis?.operationalExpenses) || 0)}
              change={Number(data?.kpis?.expensesChange) || 0}
              changeLabel="VS PERIODO ANTERIOR"
              trend={(data?.kpis?.expensesChange || 0) < 0 ? 'up' : 'down'}
              icon={<BarChart3 className="w-6 h-6 text-error" />}
              sparklineData={Array.isArray(expensesTrend) ? expensesTrend : [{ value: 0 }]}
            />
          </div>
        )}

        {visibleKpis.includes('pipelineValue') && (
          <div onClick={() => handleKpiDrillDown('/pipeline-ventas')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="VALOR PIPELINE"
              value={formatCurrency(Number(data?.kpis?.pipelineValue) || 0)}
              change={pipelineChange}
              changeLabel={pipelineLabel}
              trend={pipelineTrend}
              icon={<TrendingUp className="w-6 h-6 text-primary" />}
              sparklineData={Array.isArray(pipelineTrendData) ? pipelineTrendData : [{ value: 0 }]}
            />
          </div>
        )}

        {visibleKpis.includes('activeClients') && (
          <div onClick={() => handleKpiDrillDown('/clientes')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="CLIENTES ACTIVOS"
              value={formatNumber(Number(data?.kpis?.activeClients) || 0)}
              change={Number(data?.kpis?.clientsGrowth) || 0}
              changeLabel={`${Number(data?.kpis?.newClientsThisPeriod) || 0} NUEVOS EN PERIODO`}
              trend={(data?.kpis?.clientsGrowth || 0) > 0 ? 'up' : 'neutral'}
              icon={<Users className="w-6 h-6 text-primary" />}
              sparklineData={Array.isArray(clientsTrend) ? clientsTrend : [{ value: 5 }]}
            />
          </div>
        )}

{visibleKpis.includes('ticketResolutionRate') && (
          <div onClick={() => handleKpiDrillDown('/tickets-soporte')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="% RESOLUCIÓN TICKETS"
              value={`${(data?.kpis?.ticketResolutionRate || 0).toFixed(1)}%`}
              change={0}
              changeLabel="TASA DE RESPUESTA"
              trend="neutral"
              icon={<CheckCircle2 className="w-6 h-6 text-success" />}
              sparklineData={Array.isArray(salesTrend) ? salesTrend.map(v => ({ value: v.value * 0.8 })) : [{ value: 0 }]}
            />
          </div>
        )}

        {visibleKpis.includes('marketingRoi') && (
          <div onClick={() => handleKpiDrillDown('/marketing')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="ROI MARKETING"
              value={`${(data?.kpis?.marketingRoi || 0).toFixed(1)}x`}
              change={0}
              changeLabel={`GASTO: $${(data?.kpis?.marketingSpent || 0).toLocaleString()}`}
              trend="up"
              icon={<Megaphone className="w-6 h-6 text-indigo-500" />}
              sparklineData={Array.isArray(salesTrend) ? salesTrend.map(v => ({ value: v.value * 0.1 })) : [{ value: 0 }]}
            />
          </div>
        )}

{visibleKpis.includes('wonValue') && (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="NEGOCIOS GANADOS"
              value={formatCurrency(Number(data?.kpis?.wonValue) || 0)}
              change={0}
              changeLabel={`${Number(data?.kpis?.wonCount) || 0} CIERRES EXITOSOS`}
              trend="up"
              icon={<Target className="w-6 h-6 text-success" />}
              sparklineData={Array.isArray(salesTrend) ? salesTrend : [{ value: 0 }]}
            />
          </div>
        )}

        {visibleKpis.includes('activeContracts') && (
          <div onClick={() => handleKpiDrillDown('/contratos')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <KPICard
              title="CONTRATOS ACTIVOS"
              value={formatNumber(Number(data?.kpis?.activeContracts) || 0)}
              change={0}
              changeLabel="VIGENCIA ACTUAL"
              trend="neutral"
              icon={<Briefcase className="w-6 h-6 text-slate-700" />}
              sparklineData={Array.isArray(clientsTrend) ? clientsTrend : [{ value: 5 }]}
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
<div className="h-80 flex items-end justify-between gap-3">
            {!Array.isArray(chartRows) || chartRows.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                No hay datos para el periodo seleccionado
              </div>
            ) : (
              chartRows.map((row: any, idx: number) => {
                const incomeHeight = Math.max(((row?.incomes || 0) / maxChartValue) * 280, 8)
                const expenseHeight = Math.max(((row?.expenses || 0) / maxChartValue) * 280, 8)
                return (
                  <div key={row?.month || idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex gap-2 items-end relative">
                      <div className="flex-1 flex flex-col items-center relative">
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-success text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">
                          ${(row?.incomes || 0).toLocaleString()}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-success to-green-400 rounded-t-lg shadow-sm hover:shadow-md transition-all"
                          style={{ height: `${incomeHeight}px` }}
                        ></div>
                      </div>
                      <div className="flex-1 flex flex-col items-center relative">
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-error text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">
                          ${(row?.expenses || 0).toLocaleString()}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-error to-red-400 rounded-t-lg shadow-sm hover:shadow-md transition-all"
                          style={{ height: `${expenseHeight}px` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{row?.label || ''}</span>
                  </div>
                )
              })
            )}
          </div>
        </Card>

<Card>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">RENDIMIENTO POR EMPRESA</h3>
            <p className="text-xs text-gray-500">Ventas y crecimiento por compañía</p>
          </div>
<div className="space-y-4">
            {(!data?.performanceByCompany || !Array.isArray(data.performanceByCompany) || data.performanceByCompany.length === 0) ? (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                No hay datos de rendimiento por empresa para este periodo.
              </div>
            ) : (
              data.performanceByCompany.slice(0, 5).map((company: any, i: number) => {
                const growthValue = Number(company?.growth) || 0
                const salesValue = Number(company?.sales) || 0
                const maxSales = Math.max(...data.performanceByCompany.map((c: any) => Number(c?.sales) || 0))
                const barWidth = maxSales > 0 ? (salesValue / maxSales) * 100 : 0
                
                return (
                  <div key={i} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          company?.status === 'positive' ? 'bg-success' :
                          company?.status === 'negative' ? 'bg-error' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm font-bold text-gray-900">{company?.company || 'Sin nombre'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(salesValue)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          growthValue > 0 ? 'bg-success/10 text-success' :
                          growthValue < 0 ? 'bg-error/10 text-error' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {growthValue > 0 ? '↑' : growthValue < 0 ? '↓' : '='} {Math.abs(growthValue).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 min-w-[80px]">{company?.industry || 'Sin industria'}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            company?.status === 'positive' ? 'bg-gradient-to-r from-success to-green-400' :
                            company?.status === 'negative' ? 'bg-gradient-to-r from-error to-red-400' : 'bg-gray-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })
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
                  onChange={() => toggleKpi(kpi.id)}
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
