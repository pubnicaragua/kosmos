'use client'

import { useState, useEffect, useCallback } from 'react'
import { KPICard } from '@/components/common/KPICard'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonKPI, SkeletonTable } from '@/components/ui-kit/Skeleton'
import * as XLSX from 'xlsx'

interface Activity {
  id: string
  type: 'CALL' | 'MEETING' | 'QUOTE' | 'OTHER'
  title: string
  description?: string | null
  client?: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority?: string | null
  assignedTo?: string | null
  dueDate: string
}

interface CompanyOption {
  id: string
  name: string
}

interface ActivitySummary {
  totalCalls: number
  totalMeetings: number
  totalQuotes: number
  totalOther: number
}

interface ActivityRowDraft {
  tempId: number
  sourceId?: string
  companyId: string
  type: Activity['type']
  title: string
  description: string
  client: string
  status: Activity['status']
  priority: string
  assignedTo: string
  dueDate: string
}

const STATUS_TABS = [
  { id: 'all', label: 'TODAS' },
  { id: 'PENDING', label: 'PENDIENTES' },
  { id: 'IN_PROGRESS', label: 'EN PROGRESO' },
  { id: 'COMPLETED', label: 'COMPLETADAS' },
]

export default function ActividadesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(() => {
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || 'all'
  })
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [draftRows, setDraftRows] = useState<ActivityRowDraft[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, ActivityRowDraft>>({})

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('page', currentPage.toString())
      params.append('limit', '10')

      const [activitiesRes, summaryRes] = await Promise.all([
        fetch(`/api/activities?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/activities/summary?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const activitiesData = await activitiesRes.json()
      const summaryData = await summaryRes.json()

      if (activitiesData.success) {
        const payload = activitiesData.data
        if (payload?.data && payload?.pagination) {
          setActivities(payload.data)
          setTotalPages(payload.pagination.totalPages || 1)
        } else {
          setActivities(Array.isArray(payload) ? payload : [])
          setTotalPages(1)
        }
      }

      if (summaryData.success) {
        setSummary({
          totalCalls: summaryData.data?.calls?.total || 0,
          totalMeetings: summaryData.data?.meetings?.total || 0,
          totalQuotes: summaryData.data?.quotes?.total || 0,
          totalOther: summaryData.data?.others?.total || 0,
        })
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

  useEffect(() => {
    const fetchCompanies = async () => {
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
    }

    fetchCompanies()
  }, [])

  const resolveDefaultCompanyId = () => {
    if (selectedCompany !== 'all') return selectedCompany
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || companies[0]?.id || ''
  }

  const addInlineRow = () => {
    const companyId = resolveDefaultCompanyId()
    if (!companyId) {
      alert('Selecciona una empresa antes de agregar una fila')
      return
    }

    setDraftRows((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        companyId,
        type: 'CALL',
        title: '',
        description: '',
        client: '',
        status: 'PENDING',
        priority: 'Media',
        assignedTo: '',
        dueDate: new Date().toISOString().split('T')[0],
      },
    ])
  }

  const startEditingRow = (activity: Activity) => {
    setEditingRows((prev) => ({
      ...prev,
      [activity.id]: {
        tempId: Date.now(),
        sourceId: activity.id,
        companyId: resolveDefaultCompanyId(),
        type: activity.type,
        title: activity.title,
        description: activity.description || '',
        client: activity.client || '',
        status: activity.status,
        priority: activity.priority || 'Media',
        assignedTo: activity.assignedTo || '',
        dueDate: activity.dueDate.split('T')[0],
      },
    }))
  }

  const cancelEditingRow = (activityId: string) => {
    setEditingRows((prev) => {
      const next = { ...prev }
      delete next[activityId]
      return next
    })
  }

  const updateDraftRow = (tempId: number, field: keyof ActivityRowDraft, value: string) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, [field]: value } : row))
    )
  }

  const updateEditingRow = (activityId: string, field: keyof ActivityRowDraft, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value,
      },
    }))
  }

  const saveRow = async (row: ActivityRowDraft, mode: 'create' | 'update') => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    if (!row.title || !row.dueDate || (mode === 'create' && !row.companyId)) {
      alert('Completa empresa, título y fecha límite')
      return
    }

    try {
      const endpoint = mode === 'create' ? '/api/activities' : `/api/activities/${row.sourceId}`
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(mode === 'create' ? { companyId: row.companyId } : {}),
          type: row.type,
          title: row.title,
          description: row.description || undefined,
          client: row.client || undefined,
          status: row.status,
          priority: row.priority || undefined,
          assignedTo: row.assignedTo || undefined,
          dueDate: row.dueDate,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo guardar la actividad')
        return
      }

      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        cancelEditingRow(row.sourceId)
      }

      fetchData()
    } catch (error) {
      console.error('Error saving activity row:', error)
      alert('Error al guardar actividad')
    }
  }

  const deleteActivity = async (activityId: string) => {
    const confirmed = window.confirm('¿Deseas eliminar esta actividad?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      if (!data.success) {
        alert(data.error || 'No se pudo eliminar la actividad')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Error al eliminar actividad')
    }
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: ActivityRowDraft,
    mode: 'create' | 'update'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveRow(row, mode)
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        deleteActivity(row.sourceId)
      }
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await fetch(`/api/activities/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!data.success) return

      const rows = data.data.data as Array<Record<string, unknown>>
      if (!rows || rows.length === 0) {
        alert('No hay actividades para exportar con los filtros actuales')
        return
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Actividades')
      XLSX.writeFile(workbook, data.data.filename || `actividades_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting activities:', error)
    } finally {
      setIsExporting(false)
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
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
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

        <div className="flex gap-4">
          <div className="h-10 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-56 bg-slate-200 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>

        <SkeletonTable rows={8} columns={8} />
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
          <Button variant="outline" onClick={addInlineRow}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AGREGAR FILA
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isExporting ? 'EXPORTANDO...' : 'EXPORTAR'}
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
        <KPICard title="LLAMADAS" value={summary?.totalCalls?.toString() || '0'} icon={<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} />
        <KPICard title="REUNIONES" value={summary?.totalMeetings?.toString() || '0'} icon={<svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <KPICard title="COTIZACIONES" value={summary?.totalQuotes?.toString() || '0'} icon={<svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <KPICard title="OTRAS" value={summary?.totalOther?.toString() || '0'} icon={<svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} />
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">TIPO</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">TÍTULO</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">DESCRIPCIÓN</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">CLIENTE</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">ASIGNADO A</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">FECHA LÍMITE</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">PRIORIDAD</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row) => (
                <tr key={row.tempId} className="border-b border-blue-100 bg-blue-50/40">
                  <td className="py-2 px-2">
                    <select value={row.type} onChange={(e) => updateDraftRow(row.tempId, 'type', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="CALL">Llamada</option>
                      <option value="MEETING">Reunión</option>
                      <option value="QUOTE">Cotización</option>
                      <option value="OTHER">Otra</option>
                    </select>
                  </td>
                  <td className="py-2 px-2"><input value={row.title} onChange={(e) => updateDraftRow(row.tempId, 'title', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Título" /></td>
                  <td className="py-2 px-2"><input value={row.description} onChange={(e) => updateDraftRow(row.tempId, 'description', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Descripción" /></td>
                  <td className="py-2 px-2"><input value={row.client} onChange={(e) => updateDraftRow(row.tempId, 'client', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Cliente" /></td>
                  <td className="py-2 px-2"><input value={row.assignedTo} onChange={(e) => updateDraftRow(row.tempId, 'assignedTo', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Responsable" /></td>
                  <td className="py-2 px-2"><input type="date" value={row.dueDate} onChange={(e) => updateDraftRow(row.tempId, 'dueDate', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                  <td className="py-2 px-2"><select value={row.priority} onChange={(e) => updateDraftRow(row.tempId, 'priority', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></td>
                  <td className="py-2 px-2"><select value={row.status} onChange={(e) => updateDraftRow(row.tempId, 'status', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, row, 'create')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En progreso</option><option value="COMPLETED">Completada</option><option value="CANCELLED">Cancelada</option></select></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" onClick={() => saveRow(row, 'create')}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))}>Quitar</Button>
                    </div>
                  </td>
                </tr>
              ))}

              {activities.map((activity) => (
                editingRows[activity.id] ? (
                  <tr key={activity.id} className="border-b border-blue-100 bg-blue-50/30">
                    <td className="py-2 px-2">
                      <select value={editingRows[activity.id].type} onChange={(e) => updateEditingRow(activity.id, 'type', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="CALL">Llamada</option>
                        <option value="MEETING">Reunión</option>
                        <option value="QUOTE">Cotización</option>
                        <option value="OTHER">Otra</option>
                      </select>
                    </td>
                    <td className="py-2 px-2"><input value={editingRows[activity.id].title} onChange={(e) => updateEditingRow(activity.id, 'title', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                    <td className="py-2 px-2"><input value={editingRows[activity.id].description} onChange={(e) => updateEditingRow(activity.id, 'description', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                    <td className="py-2 px-2"><input value={editingRows[activity.id].client} onChange={(e) => updateEditingRow(activity.id, 'client', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                    <td className="py-2 px-2"><input value={editingRows[activity.id].assignedTo} onChange={(e) => updateEditingRow(activity.id, 'assignedTo', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                    <td className="py-2 px-2"><input type="date" value={editingRows[activity.id].dueDate} onChange={(e) => updateEditingRow(activity.id, 'dueDate', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" /></td>
                    <td className="py-2 px-2"><select value={editingRows[activity.id].priority} onChange={(e) => updateEditingRow(activity.id, 'priority', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></td>
                    <td className="py-2 px-2"><select value={editingRows[activity.id].status} onChange={(e) => updateEditingRow(activity.id, 'status', e.target.value)} onKeyDown={(e) => handleRowKeyDown(e, editingRows[activity.id], 'update')} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En progreso</option><option value="COMPLETED">Completada</option><option value="CANCELLED">Cancelada</option></select></td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => saveRow(editingRows[activity.id], 'update')}>Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEditingRow(activity.id)}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-3"><div className="text-sm font-medium text-gray-900">{getTypeLabel(activity.type)}</div></td>
                    <td className="py-4 px-3"><div className="text-sm font-medium text-gray-900">{activity.title}</div></td>
                    <td className="py-4 px-3"><div className="text-sm text-gray-600">{activity.description || '-'}</div></td>
                    <td className="py-4 px-3"><div className="text-sm text-gray-600">{activity.client || '-'}</div></td>
                    <td className="py-4 px-3"><div className="text-sm text-gray-600">{activity.assignedTo || '-'}</div></td>
                    <td className="py-4 px-3"><div className="text-sm text-gray-600">{new Date(activity.dueDate).toLocaleDateString('es-ES')}</div></td>
                    <td className="py-4 px-3"><div className="text-sm text-gray-600">{activity.priority || '-'}</div></td>
                    <td className="py-4 px-3 text-center">{getStatusBadge(activity.status)}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingRow(activity)}>Editar</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteActivity(activity.id)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        {activities.length === 0 && draftRows.length === 0 && (
          <div className="text-center py-12 text-gray-500">No se encontraron actividades</div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-gray-200">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded ${currentPage === page ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                {page}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
