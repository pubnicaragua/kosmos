'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui-kit/Card'

interface MonitorData {
  serverTime: string
  companies: number
  users: number
  activeCompanies: number
}

export default function SistemaMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null)

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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sistema Operativo</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoreo rápido del estado general del CRM</p>
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
