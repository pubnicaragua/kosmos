'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

type SecurityLevel = 'secure' | 'warning' | 'error'

interface MonitorData {
  serverTime: string
  companies: number
  activeCompanies: number
  uptime: string
  memoryUsage: number
  cpuUsage: number
  activeSessions: number
  securityStatus: {
    ssl: SecurityLevel
    auth: SecurityLevel
    firewall: SecurityLevel
    ddos: SecurityLevel
    backup: SecurityLevel
    encryption: SecurityLevel
  }
  recentActivity: Array<{ time: string; action: string; status: 'success' | 'warning' | 'error' }>
}

export default function SistemaMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isCapturingErrors, setIsCapturingErrors] = useState(false)

  const handleCaptureErrors = async () => {
    setIsCapturingErrors(true)
    try {
      const logs: string[] = []
      const originalConsoleError = console.error
      const originalConsoleWarn = console.warn

      console.error = (...args: any[]) => {
        logs.push(`[ERROR] ${new Date().toISOString()}: ${args.join(' ')}`)
        originalConsoleError(...args)
      }
      console.warn = (...args: any[]) => {
        logs.push(`[WARN] ${new Date().toISOString()}: ${args.join(' ')}`)
        originalConsoleWarn(...args)
      }

      setTimeout(() => {
        console.error = originalConsoleError
        console.warn = originalConsoleWarn

        const blob = new Blob([logs.join('\n')], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `error-log-${Date.now()}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setIsCapturingErrors(false)
        alert(`Se capturaron ${logs.length} entradas de log`)
      }, 180000)

      alert('Capturando errores durante 180 segundos. Reproduce el error ahora.')
    } catch (error) {
      console.error('Error capturing logs:', error)
      setIsCapturingErrors(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        if (!cancelled) {
          setLoadError('No hay sesión activa')
          setIsLoading(false)
        }
        return
      }

      try {
        const response = await fetch('/api/system/monitor', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })

        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudieron cargar las métricas del sistema')
        }

        if (!cancelled) {
          setData(result.data)
          setLoadError('')
          setIsLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Error cargando monitor')
          setIsLoading(false)
        }
      }
    }

    load()
    const interval = setInterval(load, 10000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const getStatusColor = (status: SecurityLevel) => {
    if (status === 'secure') return 'bg-green-500'
    if (status === 'warning') return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusBadge = (status: SecurityLevel) => {
    if (status === 'secure') return <Badge variant="success">SEGURO</Badge>
    if (status === 'warning') return <Badge variant="warning">ADVERTENCIA</Badge>
    return <Badge variant="error">CRÍTICO</Badge>
  }

  const overallSecurity = useMemo<SecurityLevel>(() => {
    const statuses = data ? Object.values(data.securityStatus) : []
    if (statuses.length === 0) return 'warning'
    if (statuses.some((status) => status === 'error')) return 'error'
    if (statuses.every((status) => status === 'secure')) return 'secure'
    return 'warning'
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Centro de Monitoreo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Panel de control de seguridad y rendimiento del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              overallSecurity === 'secure'
                ? 'bg-green-100 text-green-700'
                : overallSecurity === 'warning'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${getStatusColor(overallSecurity)} animate-pulse`} />
            <span className="font-semibold text-sm">
              {overallSecurity === 'secure'
                ? 'Sistema Protegido'
                : overallSecurity === 'warning'
                ? 'Revisar Alertas'
                : 'Atención Requerida'}
            </span>
          </div>
          <Button onClick={handleCaptureErrors} disabled={isCapturingErrors} variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {isCapturingErrors ? 'Capturando...' : 'Capturar Logs'}
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{loadError}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-wide">Empresas</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? '-' : data?.companies ?? '-'}
              </p>
            </div>
            <svg className="w-10 h-10 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs uppercase tracking-wide">Activas</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? '-' : data?.activeCompanies ?? '-'}
              </p>
            </div>
            <svg className="w-10 h-10 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs uppercase tracking-wide">Uptime</p>
              <p className="text-3xl font-bold mt-1">{isLoading ? '-' : data?.uptime ?? '-'}</p>
            </div>
            <svg className="w-10 h-10 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs uppercase tracking-wide">CPU</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? '-' : `${data?.cpuUsage ?? 0}%`}
              </p>
            </div>
            <svg className="w-10 h-10 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-xs uppercase tracking-wide">Memoria</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? '-' : `${data?.memoryUsage ?? 0}%`}
              </p>
            </div>
            <svg className="w-10 h-10 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-xs uppercase tracking-wide">Sesiones</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? '-' : data?.activeSessions ?? '-'}
              </p>
            </div>
            <svg className="w-10 h-10 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Estado de Seguridad
            </h2>
            {getStatusBadge(overallSecurity)}
          </div>
          <div className="space-y-3">
            {[
              { key: 'ssl', label: 'Certificado SSL/TLS', icon: '🔒' },
              { key: 'auth', label: 'Autenticación JWT', icon: '🔑' },
              { key: 'firewall', label: 'Firewall Activo', icon: '🛡️' },
              { key: 'ddos', label: 'Protección DDoS', icon: '⚡' },
              { key: 'backup', label: 'Backup Automático', icon: '💾' },
              { key: 'encryption', label: 'Encriptación de Datos', icon: '🔐' },
            ].map((item) => {
              const status = data?.securityStatus[item.key as keyof MonitorData['securityStatus']] || 'warning'
              return (
                <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    <span
                      className={`text-sm font-medium ${
                        status === 'secure'
                          ? 'text-green-600'
                          : status === 'warning'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {status === 'secure' ? 'Activo' : status === 'warning' ? 'Revisar' : 'Error'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Actividad Reciente
            </h2>
            <span className="text-xs text-gray-500">Últimas 5 acciones</span>
          </div>
          <div className="space-y-2">
            {(data?.recentActivity || []).length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                No hay actividad reciente para mostrar.
              </div>
            ) : (
              data?.recentActivity.map((activity, index) => (
                <div key={`${activity.time}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activity.status === 'success'
                          ? 'bg-green-500'
                          : activity.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{activity.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Sistema en línea</span>
          </div>
          <span className="text-sm text-gray-500">
            Última actualización: {data?.serverTime || (isLoading ? 'Cargando...' : 'Sin datos')}
          </span>
        </div>
      </Card>
    </div>
  )
}
