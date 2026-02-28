'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface MonitorData {
  serverTime: string
  companies: number
  users: number
  activeCompanies: number
  uptime: string
  memoryUsage: number
  cpuUsage: number
}

interface SecurityStatus {
  ssl: 'secure' | 'warning' | 'error'
  auth: 'secure' | 'warning' | 'error'
  firewall: 'secure' | 'warning' | 'error'
  ddos: 'secure' | 'warning' | 'error'
  backup: 'secure' | 'warning' | 'error'
  encryption: 'secure' | 'warning' | 'error'
}

export default function SistemaMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null)
  const [isCapturingErrors, setIsCapturingErrors] = useState(false)
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    ssl: 'secure',
    auth: 'secure',
    firewall: 'secure',
    ddos: 'secure',
    backup: 'secure',
    encryption: 'secure',
  })
  const [recentActivity, setRecentActivity] = useState<Array<{ time: string; action: string; status: string }>>([])

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
    const load = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const [companiesRes, profileRes] = await Promise.all([
          fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/profiles/current', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const companiesResult = await companiesRes.json()
        const profileResult = await profileRes.json()

        const companies = companiesResult.success ? companiesResult.data : []

        // Simular datos de sistema
        const startTime = Date.now() - Math.random() * 86400000 * 7
        const uptimeMs = Date.now() - startTime
        const days = Math.floor(uptimeMs / 86400000)
        const hours = Math.floor((uptimeMs % 86400000) / 3600000)

        setData({
          serverTime: new Date().toLocaleString('es-ES'),
          companies: companies.length,
          activeCompanies: companies.filter((company: any) => company.isActive).length,
          users: profileResult.success ? 1 : 0,
          uptime: `${days}d ${hours}h`,
          memoryUsage: Math.floor(Math.random() * 30) + 40,
          cpuUsage: Math.floor(Math.random() * 20) + 10,
        })

        // Simular actividad reciente
        setRecentActivity([
          { time: new Date().toLocaleTimeString('es-ES'), action: 'Login exitoso', status: 'success' },
          { time: new Date(Date.now() - 300000).toLocaleTimeString('es-ES'), action: 'Backup automático completado', status: 'success' },
          { time: new Date(Date.now() - 600000).toLocaleTimeString('es-ES'), action: 'Certificado SSL verificado', status: 'success' },
          { time: new Date(Date.now() - 900000).toLocaleTimeString('es-ES'), action: 'Escaneo de seguridad completado', status: 'success' },
          { time: new Date(Date.now() - 1200000).toLocaleTimeString('es-ES'), action: 'Firewall actualizado', status: 'success' },
        ])
      } catch (error) {
        console.error('Error loading monitor data:', error)
      }
    }

    load()
    const interval = setInterval(load, 30000) // Actualizar cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'secure': return <Badge variant="success">SEGURO</Badge>
      case 'warning': return <Badge variant="warning">ADVERTENCIA</Badge>
      case 'error': return <Badge variant="error">CRÍTICO</Badge>
      default: return <Badge>DESCONOCIDO</Badge>
    }
  }

  const overallSecurity = Object.values(securityStatus).every(s => s === 'secure') ? 'secure' : 
    Object.values(securityStatus).some(s => s === 'error') ? 'error' : 'warning'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Centro de Monitoreo</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de control de seguridad y rendimiento del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            overallSecurity === 'secure' ? 'bg-green-100 text-green-700' :
            overallSecurity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-3 h-3 rounded-full ${getStatusColor(overallSecurity)} animate-pulse`}></span>
            <span className="font-semibold text-sm">
              {overallSecurity === 'secure' ? 'Sistema Protegido' : 
               overallSecurity === 'warning' ? 'Revisar Alertas' : 'Atención Requerida'}
            </span>
          </div>
          <Button onClick={handleCaptureErrors} disabled={isCapturingErrors} variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {isCapturingErrors ? 'Capturando...' : 'Capturar Logs'}
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-wide">Empresas</p>
              <p className="text-3xl font-bold mt-1">{data?.companies ?? '-'}</p>
            </div>
            <svg className="w-10 h-10 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs uppercase tracking-wide">Activas</p>
              <p className="text-3xl font-bold mt-1">{data?.activeCompanies ?? '-'}</p>
            </div>
            <svg className="w-10 h-10 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs uppercase tracking-wide">Uptime</p>
              <p className="text-3xl font-bold mt-1">{data?.uptime ?? '-'}</p>
            </div>
            <svg className="w-10 h-10 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs uppercase tracking-wide">CPU</p>
              <p className="text-3xl font-bold mt-1">{data?.cpuUsage ?? '-'}%</p>
            </div>
            <svg className="w-10 h-10 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-xs uppercase tracking-wide">Memoria</p>
              <p className="text-3xl font-bold mt-1">{data?.memoryUsage ?? '-'}%</p>
            </div>
            <svg className="w-10 h-10 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-xs uppercase tracking-wide">Sesiones</p>
              <p className="text-3xl font-bold mt-1">{data?.users ?? '-'}</p>
            </div>
            <svg className="w-10 h-10 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Panel de Seguridad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(securityStatus[item.key as keyof SecurityStatus])}`}></span>
                  <span className={`text-sm font-medium ${
                    securityStatus[item.key as keyof SecurityStatus] === 'secure' ? 'text-green-600' :
                    securityStatus[item.key as keyof SecurityStatus] === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {securityStatus[item.key as keyof SecurityStatus] === 'secure' ? 'Activo' :
                     securityStatus[item.key as keyof SecurityStatus] === 'warning' ? 'Revisar' : 'Error'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Actividad Reciente
            </h2>
            <span className="text-xs text-gray-500">Últimas 5 acciones</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-700">{activity.action}</span>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Footer con última actualización */}
      <Card className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm text-gray-600">Sistema en línea</span>
          </div>
          <span className="text-sm text-gray-500">Última actualización: {data?.serverTime || 'Cargando...'}</span>
        </div>
      </Card>
    </div>
  )
}
