'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'

interface MonitorData {
  serverTime: string
  companies: number
  users: number
  activeCompanies: number
}

export default function SistemaMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null)
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
      }, 30000)

      alert('Capturando errores durante 30 segundos. Reproduce el error ahora.')
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

        setData({
          serverTime: new Date().toLocaleString('es-ES'),
          companies: companies.length,
          activeCompanies: companies.filter((company: any) => company.isActive).length,
          users: profileResult.success ? 1 : 0,
        })
      } catch (error) {
        console.error('Error loading monitor data:', error)
      }
    }

    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sistema Operativo</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoreo rápido del estado general del CRM</p>
        </div>
        <Button
          onClick={handleCaptureErrors}
          disabled={isCapturingErrors}
          variant="outline"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {isCapturingErrors ? 'Capturando...' : 'Capturar Errores'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-sm text-gray-500">Empresas visibles</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data?.companies ?? '-'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Empresas activas</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data?.activeCompanies ?? '-'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Sesión actual</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data?.users ?? '-'}</p>
        </Card>
      </div>

      <Card>
        <p className="text-sm text-gray-500">Última actualización</p>
        <p className="text-base font-medium text-gray-900 mt-2">{data?.serverTime || 'Cargando...'}</p>
      </Card>
    </div>
  )
}
