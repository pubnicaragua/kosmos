'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { SkeletonCard } from '@/components/ui-kit/Skeleton'

interface Opportunity {
  id: string
  title: string
  client: string
  value: number
  stage: 'PROSPECTO' | 'PROPUESTA' | 'NEGOCIACION' | 'CALIFICADO'
  status: string
  assignedTo: string
  closeDate: string
}

const STAGES = [
  { id: 'PROSPECTO', label: 'Prospecto', color: 'bg-gray-100' },
  { id: 'PROPUESTA', label: 'Propuesta', color: 'bg-blue-100' },
  { id: 'NEGOCIACION', label: 'Negociación', color: 'bg-yellow-100' },
  { id: 'CALIFICADO', label: 'Calificado', color: 'bg-green-100' },
]

export default function PipelineVentasPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<Opportunity | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    value: '',
    stage: 'PROSPECTO' as const,
    assignedTo: '',
    closeDate: new Date().toISOString().split('T')[0],
  })

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
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')

    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          companyId: activeCompany.id,
        }),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchData()
        setFormData({
          title: '',
          client: '',
          value: '',
          stage: 'PROSPECTO',
          assignedTo: '',
          closeDate: new Date().toISOString().split('T')[0],
        })
      }
    } catch (error) {
      console.error('Error creating opportunity:', error)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pipeline de Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona el proceso de ventas desde prospecto hasta cierre.</p>
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
            NUEVA OPORTUNIDAD
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id)
          const stageTotal = getTotalByStage(stage.id)

          return (
            <div
              key={stage.id}
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className={`${stage.color} rounded-t-lg p-4`}>
                <h3 className="font-semibold text-gray-900 uppercase text-sm">{stage.label}</h3>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(stageTotal)}</div>
                  <div className="text-xs text-gray-600 mt-1">{stageOpportunities.length} oportunidades</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-b-lg p-4 min-h-[400px] space-y-3">
                {stageOpportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    draggable
                    onDragStart={() => handleDragStart(opportunity)}
                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border border-gray-200"
                  >
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">{opportunity.title}</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{opportunity.client}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-primary">{formatCurrency(opportunity.value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(opportunity.closeDate).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {stageOpportunities.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Sin oportunidades
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Oportunidad">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Oportunidad
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
