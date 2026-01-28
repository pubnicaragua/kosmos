'use client'

import { useState, useEffect } from 'react'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { SkeletonDashboard } from '@/components/ui-kit/Skeleton'
import { Badge } from '@/components/ui-kit/Badge'

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
  }
  monthlyData: Array<{
    month: string
    incomes: number
    expenses: number
  }>
  performanceByCompany: Array<{
    company: string
    sales: number
    growth: number
    status: string
  }>
}

export default function DashboardsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('quarter')

  useEffect(() => {
    fetchDashboardData()
  }, [selectedCompany, selectedPeriod])

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      
      const response = await fetch(`/api/dashboard/summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value)
  }

  if (isLoading) {
    return <SkeletonDashboard />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Coorporativo</h1>
          <p className="text-sm text-gray-500 mt-1">Vista consolidada de rendimiento corporativo</p>
        </div>
        <Button>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          EXPORTAR INFORME
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            { value: 'company1', label: 'Tech Solutions' },
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-64"
        />
        <Select
          options={[
            { value: 'month', label: 'ESTE MES' },
            { value: 'quarter', label: 'ESTE TRIMESTRE' },
            { value: 'year', label: 'ESTE AÑO' },
          ]}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="VENTAS TOTALES"
          value={formatCurrency(data?.kpis.totalSales || 0)}
          change={data?.kpis.salesGrowth || 0}
          changeLabel="VS PERIODO ANTERIOR"
          trend={data?.kpis.salesGrowth && data.kpis.salesGrowth > 0 ? 'up' : 'down'}
          icon={
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KPICard
          title="GASTOS OPERATIVOS"
          value={formatCurrency(data?.kpis.operationalExpenses || 0)}
          change={data?.kpis.expensesChange || 0}
          changeLabel="VS PERIODO ANTERIOR"
          trend={data?.kpis.expensesChange && data.kpis.expensesChange < 0 ? 'up' : 'down'}
          icon={
            <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />

        <KPICard
          title="VALOR PIPELINE"
          value={formatCurrency(data?.kpis.pipelineValue || 0)}
          change={data?.kpis.pipelineChange || 0}
          changeLabel="SIN CAMBIOS"
          trend="neutral"
          icon={
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <KPICard
          title="CLIENTES ACTIVOS"
          value={formatNumber(data?.kpis.activeClients || 0)}
          change={data?.kpis.clientsGrowth || 0}
          changeLabel="36 NUEVOS ESTE MES"
          trend={data?.kpis.clientsGrowth && data.kpis.clientsGrowth > 0 ? 'up' : 'neutral'}
          icon={
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">INGRESOS VS GASTOS</h3>
              <p className="text-sm text-gray-500">Comparativa semestral consolidado</p>
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
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((month, i) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1">
                  <div 
                    className="flex-1 bg-success rounded-t"
                    style={{ height: `${120 + Math.random() * 80}px` }}
                  ></div>
                  <div 
                    className="flex-1 bg-error rounded-t"
                    style={{ height: `${80 + Math.random() * 60}px` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{month}</span>
              </div>
            ))}
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
            {data?.performanceByCompany.slice(0, 4).map((company, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{company.company}</span>
                      <Badge variant={company.status === 'positive' ? 'success' : 'error'}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tecnología</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(company.sales)}</span>
                        <span className={`text-xs ${company.growth > 0 ? 'text-success' : 'text-error'}`}>
                          {company.growth > 0 ? '↑' : '↓'}{Math.abs(company.growth).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
