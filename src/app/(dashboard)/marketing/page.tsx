'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Plus, TrendingUp, Mail, Share2, Calendar, DollarSign } from 'lucide-react'

interface MarketingCampaign {
  id: string
  name: string
  description: string | null
  channel: string
  status: string
  budget: number | null
  spent: number
  startDate: string | null
  endDate: string | null
  targetAudience: string | null
  adType?: string | null
  evidenceUrl?: string | null
  approvalStatus?: string | null
  company: { name: string }
}

const STATUS_COLUMNS = [
  { 
    id: 'PLANIFICACION', 
    label: 'Planificación', 
    color: 'bg-gradient-to-br from-slate-100 to-slate-200',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    badgeColor: 'bg-slate-500'
  },
  { 
    id: 'EN_CURSO', 
    label: 'En Curso', 
    color: 'bg-gradient-to-br from-blue-100 to-blue-200',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-500'
  },
  { 
    id: 'PAUSADA', 
    label: 'Pausada', 
    color: 'bg-gradient-to-br from-amber-100 to-amber-200',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-500'
  },
  { 
    id: 'COMPLETADA', 
    label: 'Completada', 
    color: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-500'
  },
]

const CHANNEL_ICONS: Record<string, any> = {
  REDES_SOCIALES: Share2,
  EMAIL: Mail,
  PUBLICIDAD_DIGITAL: TrendingUp,
  CONTENIDO: Calendar,
  EVENTOS: Calendar,
  OTRO: Calendar,
}

const APPROVAL_STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
}

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  PENDING: 'Pendiente',
}

interface Company {
  id: string
  name: string
}

export default function MarketingPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [draggedCampaign, setDraggedCampaign] = useState<MarketingCampaign | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)

      const response = await fetch(`/api/marketing?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCampaigns(data.data)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany])

  const fetchCompanies = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) setCompanies(data.data)
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const getCampaignsByStatus = (status: string) => {
    return campaigns.filter(c => c.status === status)
  }

  const getChannelIcon = (channel: string) => {
    const Icon = CHANNEL_ICONS[channel] || Calendar
    return <Icon className="w-4 h-4" />
  }

  const getApprovalStatusLabel = (approvalStatus?: string | null) => {
    if (!approvalStatus) return 'Pendiente'
    return APPROVAL_STATUS_LABELS[approvalStatus] || approvalStatus
  }

  const getApprovalStatusStyle = (approvalStatus?: string | null) => {
    const normalizedStatus = approvalStatus || 'PENDING'
    return APPROVAL_STATUS_STYLES[normalizedStatus] || 'bg-gray-100 text-gray-700'
  }

  const handleDragStart = (campaign: MarketingCampaign) => {
    setDraggedCampaign(campaign)
  }

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    setDragOverStatus(statusId)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedCampaign) return
    setDragOverStatus(null)

    // Optimistic update
    const previousCampaigns = [...campaigns]
    setCampaigns(prev => 
      prev.map(c => 
        c.id === draggedCampaign.id ? { ...c, status: newStatus } : c
      )
    )

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/marketing/${draggedCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        setCampaigns(previousCampaigns)
        alert('Error al mover la campaña')
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      setCampaigns(previousCampaigns)
      alert('Error al mover la campaña')
    }

    setDraggedCampaign(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-96 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tus campañas de marketing y analiza su rendimiento</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: 'all', label: 'TODAS LAS EMPRESAS' },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-52"
          />
          <Button onClick={() => router.push('/marketing/nueva')}>
            <Plus className="w-5 h-5 mr-2" />
            NUEVA CAMPAÑA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnCampaigns = getCampaignsByStatus(column.id)
          const isDragTarget = draggedCampaign && draggedCampaign.status !== column.id
          const isDropTarget = dragOverStatus === column.id
          
          return (
            <div 
              key={column.id} 
              className={`flex flex-col transition-all duration-200 rounded-lg ${
                isDropTarget 
                  ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' 
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(column.id)}
            >
              <div className={`${column.color} rounded-t-lg px-4 py-3 border-b-2 border-gray-300`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  <span className="bg-white px-2 py-1 rounded-full text-xs font-medium">
                    {columnCampaigns.length}
                  </span>
                </div>
              </div>
              
              <div className={`flex-1 bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[500px] transition-all duration-200 ${
                isDropTarget ? 'bg-blue-50' : ''
              }`}>
                {columnCampaigns.map((campaign, index) => {
                  const isDragging = draggedCampaign?.id === campaign.id
                  
                  return (
                    <div
                      key={campaign.id}
                      draggable
                      onDragStart={() => handleDragStart(campaign)}
                      onDragEnd={() => { setDraggedCampaign(null); setDragOverStatus(null) }}
                      className={`group bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 select-none animate-in fade-in slide-in-from-bottom-2 ${
                        isDragging ? 'opacity-50 scale-95 rotate-1' : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'
                      }`}
                      style={{ 
                        borderLeftColor: STATUS_COLUMNS.find(c => c.id === column.id)?.badgeColor.replace('bg-', ''),
                        animationDelay: `${index * 50}ms`,
                        animationDuration: '300ms',
                        animationFillMode: 'both'
                      }}
                      onClick={(e) => {
                        if (!isDragging) router.push(`/marketing/${campaign.id}`)
                      }}
                    >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{campaign.name}</h4>
                      <div className={`p-2 rounded-lg ${STATUS_COLUMNS.find(c => c.id === column.id)?.color} transition-transform hover:rotate-12`}>
                        {getChannelIcon(campaign.channel)}
                      </div>
                    </div>
                    
                    {campaign.description && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-medium ${getApprovalStatusStyle(campaign.approvalStatus)}`}
                      >
                        {getApprovalStatusLabel(campaign.approvalStatus)}
                      </span>
                      {campaign.adType && (
                        <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
                          {campaign.adType}
                        </span>
                      )}
                    </div>

                    {campaign.evidenceUrl && (
                      <a
                        href={campaign.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[11px] text-primary hover:underline mb-2 truncate"
                        title={campaign.evidenceUrl}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Evidencia: {campaign.evidenceUrl}
                      </a>
                    )}
                    
                    {campaign.budget && (
                      <div className="flex items-center justify-between text-xs mb-2 p-2 bg-gray-50 rounded">
                        <span className="text-gray-500 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Presupuesto:
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${campaign.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {campaign.spent > 0 && campaign.budget && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Gastado:</span>
                          <span className="font-semibold text-primary">
                            ${campaign.spent.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {campaign.startDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  )
                })}

                {/* Drop zone hint */}
                {isDragTarget && (
                  <div className={`border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isDropTarget 
                      ? 'border-blue-500 bg-blue-100/50 h-32 scale-105' 
                      : 'border-blue-300 bg-blue-50/30 h-24'
                  } ${columnCampaigns.length === 0 ? '' : 'mt-3'}`}>
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
                
                {columnCampaigns.length === 0 && !isDragTarget && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay campañas
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
