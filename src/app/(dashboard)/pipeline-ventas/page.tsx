'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { SkeletonCard } from '@/components/ui-kit/Skeleton'

interface Opportunity {
  id: string
  companyId?: string
  title: string
  client: string
  value: number
  stage: 'PROSPECTO' | 'PROPUESTA' | 'NEGOCIACION' | 'CALIFICADO'
  status: string
  assignedTo: string | null
  closeDate: string | null
}

interface Company {
  id: string
  name: string
}

interface OpportunityFormData {
  companyId: string
  title: string
  client: string
  value: string
  stage: Opportunity['stage']
  assignedTo: string
  closeDate: string
}

const STAGES = [
  {
    id: 'PROSPECTO',
    label: 'Prospecto',
    dot: 'bg-red-500',
    border: 'border-l-red-500',
    headerText: 'text-red-600',
    addLabel: 'AÑADIR PROSPECTO',
  },
  {
    id: 'PROPUESTA',
    label: 'Propuesta',
    dot: 'bg-blue-500',
    border: 'border-l-blue-500',
    headerText: 'text-blue-600',
    addLabel: 'AÑADIR PROPUESTA',
  },
  {
    id: 'NEGOCIACION',
    label: 'Negociación',
    dot: 'bg-yellow-500',
    border: 'border-l-yellow-500',
    headerText: 'text-yellow-600',
    addLabel: 'AÑADIR NEGOCIACIÓN',
  },
  {
    id: 'CALIFICADO',
    label: 'Calificado',
    dot: 'bg-green-500',
    border: 'border-l-green-500',
    headerText: 'text-green-600',
    addLabel: 'AÑADIR CALIFICADO',
  },
]

const STATUS_BADGE_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-700',
  ACTIVO: 'bg-green-100 text-green-700',
  GANADO: 'bg-blue-100 text-blue-700',
  PERDIDO: 'bg-red-100 text-red-700',
}

export default function PipelineVentasPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<Opportunity | null>(null)
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null)
  const [formData, setFormData] = useState<OpportunityFormData>({
    companyId: '',
    title: '',
    client: '',
    value: '',
    stage: 'PROSPECTO',
    assignedTo: '',
    closeDate: new Date().toISOString().split('T')[0],
  })

  const fetchCompanies = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)

        const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
        if (activeCompany?.id && (selectedCompany === 'all' || !selectedCompany)) {
          setSelectedCompany(activeCompany.id)
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [selectedCompany])

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)

      const response = await fetch(`/api/opportunities?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setOpportunities(data.data.data || data.data)
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetFormData = useCallback(() => {
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    setFormData({
      companyId: selectedCompany !== 'all'
        ? selectedCompany
        : (activeCompany.id || companies[0]?.id || ''),
      title: '',
      client: '',
      value: '',
      stage: 'PROSPECTO',
      assignedTo: '',
      closeDate: new Date().toISOString().split('T')[0],
    })
  }, [companies, selectedCompany])

  const openCreateModal = () => {
    setEditingOpportunityId(null)
    resetFormData()
    setIsModalOpen(true)
  }

  const openEditModal = (opportunity: Opportunity) => {
    setEditingOpportunityId(opportunity.id)
    setFormData({
      companyId: selectedCompany !== 'all' ? selectedCompany : '',
      title: opportunity.title,
      client: opportunity.client,
      value: opportunity.value.toString(),
      stage: opportunity.stage,
      assignedTo: opportunity.assignedTo || '',
      closeDate: opportunity.closeDate
        ? new Date(opportunity.closeDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) return

    if (!editingOpportunityId && !formData.companyId) {
      alert('Selecciona una empresa para crear la oportunidad')
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch(editingOpportunityId ? `/api/opportunities/${editingOpportunityId}` : '/api/opportunities', {
        method: editingOpportunityId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          client: formData.client,
          value: parseFloat(formData.value),
          stage: formData.stage,
          assignedTo: formData.assignedTo || null,
          closeDate: formData.closeDate,
          ...(editingOpportunityId ? {} : { companyId: formData.companyId }),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsModalOpen(false)
        fetchData()
      } else {
        alert(data.error || 'No se pudo guardar la oportunidad')
      }
    } catch (error) {
      console.error('Error creating opportunity:', error)
      alert('Error al guardar oportunidad')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (opportunityId: string) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta oportunidad?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setOpportunities((prev) => prev.filter((item) => item.id !== opportunityId))
      } else {
        alert(data.error || 'No se pudo eliminar la oportunidad')
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error)
      alert('Error al eliminar oportunidad')
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.set('companyId', selectedCompany)

      const response = await fetch(`/api/opportunities/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'No se pudo exportar')
        return
      }

      const rows = result.data.data as Array<Record<string, string | number | null>>
      if (!rows.length) {
        alert('No hay datos para exportar')
        return
      }

      const headers = Object.keys(rows[0])
      const csvLines = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header] ?? ''
              const text = String(value).replace(/"/g, '""')
              return `"${text}"`
            })
            .join(',')
        ),
      ]

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', result.data.filename || `pipeline_ventas_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting opportunities:', error)
      alert('Error al exportar oportunidades')
    }
  }

  const handleDragStart = (opportunity: Opportunity) => {
    setDraggedItem(opportunity)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStage: string) => {
    if (!draggedItem) return

    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`/api/opportunities/${draggedItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage,
        }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error updating opportunity:', error)
    }

    setDraggedItem(null)
  }

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities.filter(opp => opp.stage === stage)
  }

  const getTotalByStage = (stage: string) => {
    return getOpportunitiesByStage(stage).reduce((sum, opp) => sum + opp.value, 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
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
            <div className="h-10 w-56 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Pipeline de Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión visual de oportunidades activas y pronóstico de cierre.</p>
        </div>
      </div>

      {/* Filters + Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-52"
        />
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          EXPORTAR
        </Button>
        <Button variant="outline" onClick={() => openEditModal(opportunities[0])} className="flex items-center gap-2" disabled={opportunities.length === 0}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          EDITAR
        </Button>
        <Button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          AÑADIR
        </Button>
      </div>

      {/* Stage summary row */}
      <div className="flex items-center gap-6 flex-wrap">
        {STAGES.map((stage) => {
          const count = getOpportunitiesByStage(stage.id).length
          const total = getTotalByStage(stage.id)
          return (
            <div key={stage.id} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stage.dot}`} />
              <span className={`text-sm font-semibold uppercase ${stage.headerText}`}>
                {stage.label}
              </span>
              <span className="text-sm font-bold text-gray-700">{count}</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          )
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id)
          const isDragTarget = draggedItem && draggedItem.stage !== stage.id

          return (
            <div
              key={stage.id}
              className={`flex flex-col rounded-xl transition-colors ${isDragTarget ? 'bg-blue-50/60' : 'bg-gray-50'}`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Cards */}
              <div className="p-3 space-y-3 min-h-[320px]">
                {stageOpportunities.map((opportunity) => {
                  const statusKey = (opportunity.status || 'PENDIENTE').toUpperCase()
                  const badgeClass = STATUS_BADGE_COLORS[statusKey] || 'bg-gray-100 text-gray-600'
                  const initials = opportunity.assignedTo
                    ? opportunity.assignedTo.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                    : opportunity.client.charAt(0).toUpperCase()

                  return (
                    <div
                      key={opportunity.id}
                      draggable
                      onDragStart={() => handleDragStart(opportunity)}
                      onDragEnd={() => setDraggedItem(null)}
                      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border border-gray-100 border-l-4 ${stage.border} select-none`}
                    >
                      <div className="p-4">
                        {/* Status badge + actions */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(opportunity) }}
                              type="button"
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Editar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(opportunity.id) }}
                              type="button"
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Eliminar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4
                          className="font-bold text-gray-900 text-sm leading-tight mb-0.5 cursor-pointer hover:text-blue-700"
                          onClick={() => openEditModal(opportunity)}
                        >
                          {opportunity.title.toUpperCase()}
                        </h4>

                        {/* Client */}
                        <p className="text-xs text-gray-500 mb-3">{opportunity.client}</p>

                        {/* Close date */}
                        {opportunity.closeDate && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-blue-600 font-medium">
                              Cierre: {new Date(opportunity.closeDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}

                        {/* Value + Avatar */}
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-gray-900">
                            {formatCurrency(opportunity.value)}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{initials}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Drop zone hint when dragging */}
                {isDragTarget && stageOpportunities.length === 0 && (
                  <div className="border-2 border-dashed border-blue-300 rounded-xl h-24 flex items-center justify-center">
                    <span className="text-sm text-blue-400">Soltar aquí</span>
                  </div>
                )}
              </div>

              {/* Add button at bottom */}
              <div className="p-3 pt-0">
                <button
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, stage: stage.id as Opportunity['stage'] }))
                    openCreateModal()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {stage.addLabel}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOpportunityId(null)
        }}
        title={editingOpportunityId ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingOpportunityId && (
            <Select
              label="Empresa"
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              fullWidth
              required
            />
          )}
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Cliente"
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Valor"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            required
            fullWidth
          />
          <Select
            label="Etapa"
            options={STAGES.map(s => ({ value: s.id, label: s.label }))}
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
            fullWidth
          />
          <Input
            label="Asignado a"
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            fullWidth
          />
          <Input
            label="Fecha de Cierre Estimada"
            type="date"
            value={formData.closeDate}
            onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
            required
            fullWidth
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setEditingOpportunityId(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingOpportunityId ? 'Guardar Cambios' : 'Crear Oportunidad'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
