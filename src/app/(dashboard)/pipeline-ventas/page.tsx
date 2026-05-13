'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { SkeletonCard } from '@/components/ui-kit/Skeleton'
import { MultiUserSelector } from '@/components/ui-kit/MultiUserSelector'
import { ClientAutocomplete } from '@/components/ui-kit/ClientAutocomplete'
import { exportWithCompanyHeader } from '@/lib/export-utils'

interface Opportunity {
  id: string
  companyId?: string
  title: string
  client: string
  value: number
  stage: 'PROSPECTO' | 'PROPUESTA' | 'NEGOCIACION' | 'CALIFICADO'
  status: string
  assignedTo: string | null
  assignedUsers: string // JSON array
  currency: 'USD' | 'NIO'
  closeDate: string | null
  priority?: 'ALTA' | 'MEDIA' | 'BAJA'
  description?: string | null
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
  currency: 'USD' | 'NIO'
  stage: Opportunity['stage']
  assignedUsers: string
  closeDate: string
  priority: 'ALTA' | 'MEDIA' | 'BAJA'
  description: string
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ALTA: { label: 'Alta', color: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
  MEDIA: { label: 'Media', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-500' },
  BAJA: { label: 'Baja', color: 'bg-green-100 text-green-700 border border-green-200', dot: 'bg-green-500' },
}

export default function PipelineVentasPage() {
  const permissions = useModulePermissions('pipeline-ventas')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<Opportunity | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null)
  const [moveReasonModal, setMoveReasonModal] = useState<{ item: Opportunity; newStage: string } | null>(null)
  const [moveReason, setMoveReason] = useState('')
  const [formData, setFormData] = useState<OpportunityFormData>({
    companyId: '',
    title: '',
    client: '',
    value: '',
    currency: 'USD',
    stage: 'PROSPECTO',
    assignedUsers: '[]',
    closeDate: new Date().toISOString().split('T')[0],
    priority: 'MEDIA',
    description: '',
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
      if (searchTerm.trim()) params.append('search', searchTerm.trim())

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
  }, [selectedCompany, searchTerm])

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
      currency: 'USD',
      stage: 'PROSPECTO',
      assignedUsers: '[]',
      closeDate: new Date().toISOString().split('T')[0],
      priority: 'MEDIA',
      description: '',
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
      currency: opportunity.currency || 'USD',
      stage: opportunity.stage,
      assignedUsers: opportunity.assignedUsers || '[]',
      closeDate: opportunity.closeDate
        ? new Date(opportunity.closeDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      priority: (opportunity.priority as any) || 'MEDIA',
      description: opportunity.description || '',
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
          currency: formData.currency,
          assignedUsers: formData.assignedUsers || '[]',
          closeDate: formData.closeDate,
          priority: formData.priority,
          description: formData.description || null,
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

  const handleExport = () => {
    if (!opportunities.length) {
      alert('No hay datos para exportar')
      return
    }

    const rows = opportunities.map((opp) => ({
      Titulo: opp.title,
      Cliente: opp.client,
      Valor: opp.value,
      Etapa: STAGES.find(s => s.id === opp.stage)?.label || opp.stage,
      Prioridad: opp.priority || 'MEDIA',
      CierreEstimado: opp.closeDate ? new Date(opp.closeDate).toLocaleDateString('es-ES') : '',
      AsignadoA: opp.assignedTo || '',
      Estado: opp.status || 'Activo'
    }))

    exportWithCompanyHeader(
      rows,
      `pipeline_ventas_${Date.now()}.xlsx`,
      'Reporte de Pipeline de Ventas',
      companies as any,
      selectedCompany
    )
  }

  const handleDragStart = (opportunity: Opportunity) => {
    setDraggedItem(opportunity)
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  const handleDragOverCard = (e: React.DragEvent, cardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCardId(cardId)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
    setDragOverCardId(null)
  }

  const handleDrop = async (newStage: string) => {
    if (!draggedItem) {
      setDragOverStage(null)
      setDragOverCardId(null)
      return
    }
    // Reorder within same column
    if (draggedItem.stage === newStage && dragOverCardId && dragOverCardId !== draggedItem.id) {
      setOpportunities(prev => {
        const stageItems = prev.filter(o => o.stage === newStage)
        const rest = prev.filter(o => o.stage !== newStage)
        const fromIdx = stageItems.findIndex(o => o.id === draggedItem.id)
        const toIdx = stageItems.findIndex(o => o.id === dragOverCardId)
        if (fromIdx === -1 || toIdx === -1) return prev
        const reordered = [...stageItems]
        const [moved] = reordered.splice(fromIdx, 1)
        reordered.splice(toIdx, 0, moved)
        return [...rest, ...reordered]
      })
      setDragOverStage(null)
      setDragOverCardId(null)
      setDraggedItem(null)
      return
    }
    if (draggedItem.stage === newStage) {
      setDragOverStage(null)
      setDragOverCardId(null)
      setDraggedItem(null)
      return
    }
    setDragOverStage(null)
    setDragOverCardId(null)
    // Show reason modal before committing the move
    setMoveReasonModal({ item: draggedItem, newStage })
    setMoveReason('')
    setDraggedItem(null)
  }

  const confirmStageMove = async () => {
    if (!moveReasonModal) return
    const { item, newStage } = moveReasonModal

    // Optimistic update
    const previousOpportunities = [...opportunities]
    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === item.id ? { ...opp, stage: newStage as Opportunity['stage'] } : opp
      )
    )
    setMoveReasonModal(null)

    const token = localStorage.getItem('accessToken')
    try {
      const response = await fetch(`/api/opportunities/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage,
          ...(moveReason.trim() ? { description: `[Movido a ${newStage}] ${moveReason.trim()}${item.description ? '\n' + item.description : ''}` } : {}),
        }),
      })
      if (!response.ok) {
        setOpportunities(previousOpportunities)
        alert('Error al mover la oportunidad')
      }
    } catch (error) {
      console.error('Error updating opportunity:', error)
      setOpportunities(previousOpportunities)
      alert('Error al mover la oportunidad')
    }
  }

  const CLIENT_COLORS = [
    { bg: 'bg-blue-50', border: 'border-l-blue-400', avatar: 'from-blue-400 to-blue-600' },
    { bg: 'bg-purple-50', border: 'border-l-purple-400', avatar: 'from-purple-400 to-purple-600' },
    { bg: 'bg-emerald-50', border: 'border-l-emerald-400', avatar: 'from-emerald-400 to-emerald-600' },
    { bg: 'bg-orange-50', border: 'border-l-orange-400', avatar: 'from-orange-400 to-orange-600' },
    { bg: 'bg-pink-50', border: 'border-l-pink-400', avatar: 'from-pink-400 to-pink-600' },
    { bg: 'bg-teal-50', border: 'border-l-teal-400', avatar: 'from-teal-400 to-teal-600' },
    { bg: 'bg-indigo-50', border: 'border-l-indigo-400', avatar: 'from-indigo-400 to-indigo-600' },
    { bg: 'bg-rose-50', border: 'border-l-rose-400', avatar: 'from-rose-400 to-rose-600' },
  ]

  const getClientColor = (clientName: string) => {
    let hash = 0
    for (let i = 0; i < clientName.length; i++) {
      hash = clientName.charCodeAt(i) + ((hash << 5) - hash)
    }
    return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length]
  }

  const getOpportunitiesByStage = (stage: string) => {
    // Return in the order stored in state (drag order is preserved by setOpportunities)
    return opportunities.filter(opp => {
      if (opp.stage !== stage) return false
      if (selectedPriority !== 'all' && opp.priority !== selectedPriority) return false
      return true
    })
  }

  const getTotalByStage = (stage: string) => {
    return getOpportunitiesByStage(stage).reduce((sum, opp) => sum + opp.value, 0)
  }

  const formatCurrencyValue = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: currency === 'NIO' ? 'NIO' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('NIO', 'C$')
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
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Buscar por título, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-48"
        />
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS PRIORIDADES' },
            { value: 'ALTA', label: '🔴 Alta' },
            { value: 'MEDIA', label: '🟡 Media' },
            { value: 'BAJA', label: '🟢 Baja' },
          ]}
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="w-48"
        />
        {permissions.canExport && (
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR
          </Button>
        )}
        {permissions.canCreate && (
          <Button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AÑADIR
          </Button>
        )}
      </div>

      {/* Stage summary row - aligned with columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const count = getOpportunitiesByStage(stage.id).length
          const total = getTotalByStage(stage.id)
          return (
            <div key={stage.id} className="flex flex-col items-center justify-center py-4 px-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.dot} shadow-sm`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${stage.headerText}`}>
                  {stage.label}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 leading-none">{count}</span>
                <span className="text-sm font-bold text-slate-500 mt-1">{formatCurrencyValue(total)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id)
          const isDragTarget = draggedItem && draggedItem.stage !== stage.id

          const isDropTarget = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className={`flex flex-col rounded-xl transition-all duration-200 ${
                isDropTarget 
                  ? 'bg-blue-100 ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' 
                  : isDragTarget 
                  ? 'bg-blue-50/60' 
                  : 'bg-gray-50'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Cards - scroll continuo */}
              <div className="p-3 space-y-3 min-h-[320px] max-h-[calc(100vh-350px)] overflow-y-auto transition-all duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {stageOpportunities.map((opportunity) => {
                  const statusKey = (opportunity.status || 'PENDIENTE').toUpperCase()
                  const badgeClass = STATUS_BADGE_COLORS[statusKey] || 'bg-gray-100 text-gray-600'
                  const initials = opportunity.assignedTo
                    ? opportunity.assignedTo.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                    : opportunity.client.charAt(0).toUpperCase()

                  const isDragging = draggedItem?.id === opportunity.id
                  const clientColor = getClientColor(opportunity.client)

                  return (
                    <div
                      key={opportunity.id}
                      draggable
                      onDragStart={() => handleDragStart(opportunity)}
                      onDragOver={(e) => handleDragOverCard(e, opportunity.id)}
                      onDragEnd={() => { setDraggedItem(null); setDragOverStage(null); setDragOverCardId(null) }}
                      className={`group rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing border border-gray-100 border-l-[6px] ${stage.border} bg-white select-none animate-in fade-in slide-in-from-bottom-2 ${
                        isDragging 
                          ? 'opacity-30 scale-90'
                          : dragOverCardId === opportunity.id && draggedItem?.stage === stage.id
                          ? 'ring-2 ring-blue-400 scale-[1.02]'
                          : 'opacity-100 scale-100 shadow-sm hover:shadow-xl hover:-translate-y-1'
                      }`}
                      style={{ 
                        animationDuration: '300ms', 
                        animationFillMode: 'both',
                        ...(isDragging && {
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        })
                      }}
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
                        <p className="text-xs text-gray-500 mb-1">{opportunity.client}</p>
                        {/* Priority badge */}
                        {opportunity.priority && PRIORITY_CONFIG[opportunity.priority] && (
                          <div className="mb-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[opportunity.priority].color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[opportunity.priority].dot}`} />
                              Prioridad {PRIORITY_CONFIG[opportunity.priority].label}
                            </span>
                          </div>
                        )}
                        {/* Description preview */}
                        {opportunity.description && !opportunity.description.startsWith('[Movido') && (
                          <p className="text-xs text-gray-400 italic mb-2 line-clamp-2">{opportunity.description}</p>
                        )}
                        {opportunity.description?.startsWith('[Movido') && (
                          <p className="text-xs text-blue-400 italic mb-2 line-clamp-1">{opportunity.description.split('\n')[0]}</p>
                        )}

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

                        {/* Value + Avatars */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-lg font-black text-slate-800">
                            {formatCurrencyValue(opportunity.value, opportunity.currency)}
                          </span>
                          <div className="flex -space-x-2 overflow-hidden">
                            {(() => {
                              try {
                                const userIds = JSON.parse(opportunity.assignedUsers || '[]') as string[]
                                if (userIds.length === 0) return (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white">
                                    <span className="text-[10px] font-bold text-slate-400">?</span>
                                  </div>
                                )
                                return userIds.map((uid, idx) => (
                                  <div key={uid} className={`w-8 h-8 rounded-full bg-gradient-to-br ${CLIENT_COLORS[idx % CLIENT_COLORS.length].avatar} flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-black/5`} title="Usuario asignado">
                                    <span className="text-white text-[10px] font-bold">U{idx+1}</span>
                                  </div>
                                ))
                              } catch { return null }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Drop zone hint when dragging */}
                {isDragTarget && (
                  <div className={`border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isDropTarget 
                      ? 'border-blue-500 bg-blue-100/50 h-32 scale-105' 
                      : 'border-blue-300 bg-blue-50/30 h-24'
                  } ${stageOpportunities.length === 0 ? '' : 'mt-3'}`}>
                    <div className="text-center">
                      <svg className={`w-8 h-8 mx-auto mb-1 transition-all ${
                        isDropTarget ? 'text-blue-600 scale-110' : 'text-blue-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className={`text-sm font-medium ${
                        isDropTarget ? 'text-blue-700' : 'text-blue-500'
                      }`}>
                        {isDropTarget ? 'Soltar ahora' : 'Soltar aquí'}
                      </span>
                    </div>
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

      {/* Move-reason modal */}
      <Modal
        isOpen={!!moveReasonModal}
        onClose={() => setMoveReasonModal(null)}
        title="Motivo del Movimiento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Moviendo <strong>{moveReasonModal?.item.title}</strong> a etapa{' '}
            <strong className="text-blue-600">{STAGES.find(s => s.id === moveReasonModal?.newStage)?.label}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descripción (opcional)</label>
            <textarea
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="Ej: Cliente solicitó propuesta formal, negoció precio, cerró trato..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMoveReasonModal(null)}>Cancelar</Button>
            <Button onClick={confirmStageMove}>Confirmar Movimiento</Button>
          </div>
        </div>
      </Modal>

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <ClientAutocomplete
              companyId={formData.companyId || (selectedCompany !== 'all' ? selectedCompany : '')}
              value={formData.client}
              onChange={(value) => setFormData({ ...formData, client: value })}
              placeholder="Buscar o escribir nombre del cliente..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
            <div className="flex gap-2">
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'NIO' })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="USD">$ USD</option>
                <option value="NIO">C$ NIO</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Select
            label="Etapa"
            options={STAGES.map(s => ({ value: s.id, label: s.label }))}
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
            fullWidth
          />
          <Select
            label="Prioridad"
            options={[
              { value: 'ALTA', label: '🔴 Alta' },
              { value: 'MEDIA', label: '🟡 Media' },
              { value: 'BAJA', label: '🟢 Baja' },
            ]}
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            fullWidth
          />
          <div className="space-y-1.5">
            <MultiUserSelector
              label="Asignar Equipo (Multi-usuario)"
              companyId={formData.companyId || (selectedCompany !== 'all' ? selectedCompany : '')}
              selectedUserIds={(() => {
                try {
                  return JSON.parse(formData.assignedUsers || '[]')
                } catch { return [] }
              })()}
              onChange={(ids) => setFormData({ ...formData, assignedUsers: JSON.stringify(ids) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles de la oportunidad..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
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
