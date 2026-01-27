'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'

interface Activity {
  id: string
  type: 'CALL' | 'MEETING' | 'QUOTE' | 'OTHER'
  title: string
  description: string
  client: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: string
  assignedTo: string
  dueDate: string
  completedAt: string | null
}

interface ActivitySummary {
  totalCalls: number
  totalMeetings: number
  totalQuotes: number
  totalOther: number
}

export default function ActividadesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'CALL' as const,
    title: '',
    description: '',
    client: '',
    status: 'PENDING' as const,
    priority: 'Media',
    assignedTo: '',
    dueDate: new Date().toISOString().split('T')[0],
  })

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('page', currentPage.toString())
      params.append('limit', '10')

      const [activitiesRes, summaryRes] = await Promise.all([
        fetch(`/api/activities?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/activities/summary?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      const activitiesData = await activitiesRes.json()
      const summaryData = await summaryRes.json()

      if (activitiesData.success) {
        setActivities(activitiesData.data.data || activitiesData.data)
      }

      if (summaryData.success) {
        setSummary(summaryData.data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedType, selectedStatus, currentPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId: activeCompany.id,
        }),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchData()
        setFormData({
          type: 'CALL',
          title: '',
          description: '',
          client: '',
          status: 'PENDING',
          priority: 'Media',
          assignedTo: '',
          dueDate: new Date().toISOString().split('T')[0],
        })
      }
    } catch (error) {
      console.error('Error creating activity:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'default'> = {
      COMPLETED: 'success',
      IN_PROGRESS: 'warning',
      PENDING: 'default',
      CANCELLED: 'default',
    }
    const labels: Record<string, string> = {
      COMPLETED: 'Completado',
      IN_PROGRESS: 'En Progreso',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CALL: 'Llamada',
      MEETING: 'Reunión',
      QUOTE: 'Cotización',
      OTHER: 'Otra',
    }
    return labels[type] || type
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
          <h1 className="text-2xl font-semibold text-gray-900">Actividades</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona llamadas, reuniones, cotizaciones y otras actividades.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            NUEVA ACTIVIDAD
          </Button>
        </div>
      </div>

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
            { value: 'all', label: 'TODOS LOS TIPOS' },
            { value: 'CALL', label: 'Llamadas' },
            { value: 'MEETING', label: 'Reuniones' },
            { value: 'QUOTE', label: 'Cotizaciones' },
            { value: 'OTHER', label: 'Otras' },
          ]}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-56"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="LLAMADAS"
          value={summary?.totalCalls.toString() || '0'}
          icon={
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />

        <KPICard
          title="REUNIONES"
          value={summary?.totalMeetings.toString() || '0'}
          icon={
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <KPICard
          title="COTIZACIONES"
          value={summary?.totalQuotes.toString() || '0'}
          icon={
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <KPICard
          title="OTRAS"
          value={summary?.totalOther.toString() || '0'}
          icon={
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'PENDING'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PENDIENTES
          </button>
          <button
            onClick={() => setSelectedStatus('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'IN_PROGRESS'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            EN PROGRESO
          </button>
          <button
            onClick={() => setSelectedStatus('COMPLETED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'COMPLETED'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            COMPLETADAS
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TIPO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TÍTULO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">ASIGNADO A</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">FECHA LÍMITE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">PRIORIDAD</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{getTypeLabel(activity.type)}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                    <div className="text-xs text-gray-500">{activity.description}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{activity.client}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{activity.assignedTo}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">
                      {new Date(activity.dueDate).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{activity.priority}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(activity.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron actividades
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Actividad">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo"
            options={[
              { value: 'CALL', label: 'Llamada' },
              { value: 'MEETING', label: 'Reunión' },
              { value: 'QUOTE', label: 'Cotización' },
              { value: 'OTHER', label: 'Otra' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            fullWidth
          />
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
          />
          <Input
            label="Cliente"
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            fullWidth
          />
          <Input
            label="Asignado a"
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            fullWidth
          />
          <Input
            label="Fecha Límite"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            fullWidth
          />
          <Select
            label="Prioridad"
            options={[
              { value: 'Alta', label: 'Alta' },
              { value: 'Media', label: 'Media' },
              { value: 'Baja', label: 'Baja' },
            ]}
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            fullWidth
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Actividad
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
