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
  assignedTo: string | null
  assignedUsers: string // JSON array
  approvalStatus: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedCampaign, setDraggedCampaign] = useState<MarketingCampaign | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())

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
  }, [selectedCompany, searchTerm])

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

  const handleDragOverCard = (e: React.DragEvent, cardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCardId(cardId)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
    setDragOverCardId(null)
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedCampaign) return
    setDragOverStatus(null)
    setDragOverCardId(null)

    // Reorder within same column
    if (draggedCampaign.status === newStatus && dragOverCardId && dragOverCardId !== draggedCampaign.id) {
      setCampaigns(prev => {
        const colItems = prev.filter(c => c.status === newStatus)
        const rest = prev.filter(c => c.status !== newStatus)
        const fromIdx = colItems.findIndex(c => c.id === draggedCampaign.id)
        const toIdx = colItems.findIndex(c => c.id === dragOverCardId)
        if (fromIdx === -1 || toIdx === -1) return prev
        const reordered = [...colItems]
        const [moved] = reordered.splice(fromIdx, 1)
        reordered.splice(toIdx, 0, moved)
        return [...rest, ...reordered]
      })
      setDraggedCampaign(null)
      return
    }
    if (draggedCampaign.status === newStatus) {
      setDraggedCampaign(null)
      return
    }

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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Buscar campañas..."
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
              className={`flex flex-col transition-all duration-300 rounded-xl bg-white border border-gray-200 shadow-sm ${
                isDropTarget 
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.01] bg-slate-50' 
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(column.id)}
            >
              <div className={`${column.color.replace('from-', 'border-t-4 border-')} rounded-t-xl px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between`}>
                <h3 className="font-bold text-gray-800 text-sm tracking-tight uppercase">{column.label}</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {columnCampaigns.length}
                </span>
              </div>
              
              <div className={`flex-1 p-3 space-y-4 min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 transition-colors duration-300 ${
                isDropTarget ? 'bg-primary/5' : ''
              }`}>
                {columnCampaigns.map((campaign, index) => {
                  const isDragging = draggedCampaign?.id === campaign.id
                  
                  return (
                    <div
                      key={campaign.id}
                      draggable
                      onDragStart={() => handleDragStart(campaign)}
                      onDragOver={(e) => handleDragOverCard(e, campaign.id)}
                      onDragEnd={() => { setDraggedCampaign(null); setDragOverStatus(null); setDragOverCardId(null) }}
                      className={`group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing border-l-4 select-none ${
                        isDragging
                          ? 'opacity-40 scale-95 rotate-1 grayscale shadow-inner border-gray-400'
                          : dragOverCardId === campaign.id && draggedCampaign?.id !== campaign.id
                          ? 'ring-2 ring-primary scale-[1.02] border border-primary/20'
                          : 'border border-gray-100'
                      }`}
                      style={{ 
                        borderLeftColor: column.badgeColor.replace('bg-', ''),
                      }}
                      onClick={(e) => {
                        if (!isDragging) router.push(`/marketing/${campaign.id}`)
                      }}
                    >
                      {/* Drag Handle Highlight */}
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      </div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getApprovalStatusStyle(campaign.approvalStatus)}`}>
                            {getApprovalStatusLabel(campaign.approvalStatus)}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{campaign.name}</h4>
                        </div>
                        <div className={`p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300`}>
                          {getChannelIcon(campaign.channel)}
                        </div>
                      </div>
                      
                      {campaign.description && (
                        <p className="text-[11px] text-gray-500 mb-4 line-clamp-2 italic leading-relaxed">
                          "{campaign.description}"
                        </p>
                      )}

                      <div className="space-y-3">
                        {campaign.budget && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] mb-1.5">
                              <span className="text-gray-400 font-medium flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> PRESUPUESTO
                              </span>
                              <span className="font-bold text-gray-700">${campaign.budget.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-gray-400 font-medium">GASTADO</span>
                              <span className="font-bold text-primary">${campaign.spent.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min((campaign.spent / (campaign.budget || 1)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
                          {campaign.startDate && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex -space-x-2 overflow-hidden">
                             {JSON.parse(campaign.assignedUsers || '[]').length > 0 ? (
                               JSON.parse(campaign.assignedUsers || '[]').slice(0, 3).map((userId: string, i: number) => (
                                 <div key={userId} className="w-6 h-6 rounded-full bg-primary border-2 border-white flex items-center justify-center text-[8px] font-black text-white hover:z-10 transition-transform hover:scale-110">
                                   U{i+1}
                                 </div>
                               ))
                             ) : (
                               <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400">?</div>
                             )}
                             {JSON.parse(campaign.assignedUsers || '[]').length > 3 && (
                               <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[7px] font-black text-slate-600">
                                 +{JSON.parse(campaign.assignedUsers || '[]').length - 3}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
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
