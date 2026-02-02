'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
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

export default function MarketingPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')

  useEffect(() => {
    fetchCampaigns()
  }, [selectedCompany])

  const fetchCampaigns = async () => {
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
  }

  const getCampaignsByStatus = (status: string) => {
    return campaigns.filter(c => c.status === status)
  }

  const getChannelIcon = (channel: string) => {
    const Icon = CHANNEL_ICONS[channel] || Calendar
    return <Icon className="w-4 h-4" />
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
        <Button onClick={() => router.push('/marketing/nueva')}>
          <Plus className="w-5 h-5 mr-2" />
          NUEVA CAMPAÑA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnCampaigns = getCampaignsByStatus(column.id)
          
          return (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} rounded-t-lg px-4 py-3 border-b-2 border-gray-300`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  <span className="bg-white px-2 py-1 rounded-full text-xs font-medium">
                    {columnCampaigns.length}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[500px]">
                {columnCampaigns.map((campaign, index) => (
                  <div
                    key={campaign.id}
                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 hover:scale-[1.02] hover:-translate-y-1 animate-fadeIn"
                    style={{ 
                      borderLeftColor: STATUS_COLUMNS.find(c => c.id === column.id)?.badgeColor.replace('bg-', ''),
                      animationDelay: `${index * 50}ms`
                    }}
                    onClick={() => router.push(`/marketing/${campaign.id}`)}
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
                ))}
                
                {columnCampaigns.length === 0 && (
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
