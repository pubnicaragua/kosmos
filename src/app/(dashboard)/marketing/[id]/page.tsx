'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface Campaign {
  id: string
  name: string
  description?: string
  channel: string
  status: string
  budget: number
  spent: number
  startDate: string
  endDate: string
  targetAudience?: string
  metrics?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export default function MarketingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaign = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch(`/api/marketing/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        const result = await response.json()
        if (result.success) {
          setCampaign(result.data)
        } else {
          setError('No se pudo cargar la campaña')
        }
      } catch (error) {
        console.error('Error fetching campaign:', error)
        setError('Error al cargar la campaña')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaign()
  }, [params.id, router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANIFICACION': return 'bg-gray-100 text-gray-800'
      case 'EN_CURSO': return 'bg-blue-100 text-blue-800'
      case 'PAUSADA': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETADA': return 'bg-green-100 text-green-800'
      case 'CANCELADA': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'REDES_SOCIALES':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      case 'EMAIL':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      case 'PUBLICIDAD_DIGITAL':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      case 'CONTENIDO':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      case 'EVENTOS':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Campaña no encontrada</h1>
          <p className="text-gray-600 mb-8">
            La campaña que buscas no existe o no tienes permisos para verla. 
            Puede que haya sido eliminada o el enlace sea incorrecto.
          </p>
          <Button onClick={() => router.push('/marketing')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Marketing
          </Button>
        </div>
      </div>
    )
  }

  const spentPercentage = (campaign.spent / campaign.budget) * 100

  return (
    <div className="space-y-6">
      {/* Header con Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/marketing')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Detalles de la campaña</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status.replace('_', ' ')}
          </Badge>
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información general */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {getChannelIcon(campaign.channel)}
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
                <p className="text-sm text-gray-500">{campaign.channel.replace('_', ' ')}</p>
              </div>
            </div>

            {campaign.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Descripción</h3>
                <p className="text-gray-600">{campaign.description}</p>
              </div>
            )}

            {campaign.targetAudience && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Audiencia Objetivo</h3>
                <p className="text-gray-600">{campaign.targetAudience}</p>
              </div>
            )}

            {campaign.metrics && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Métricas</h3>
                <p className="text-gray-600">{campaign.metrics}</p>
              </div>
            )}
          </Card>

          {/* Presupuesto */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Presupuesto y Gastos</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Presupuesto Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${campaign.budget.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Gastado</p>
                <p className="text-2xl font-bold text-primary">
                  ${campaign.spent.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progreso de gasto</span>
                <span className="font-medium text-gray-900">{spentPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    spentPercentage > 90 ? 'bg-red-500' : 
                    spentPercentage > 70 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Disponible: ${(campaign.budget - campaign.spent).toLocaleString()}</span>
                <span>{100 - spentPercentage > 0 ? `${(100 - spentPercentage).toFixed(1)}%` : '0%'} restante</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-6">
          {/* Fechas */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha de inicio</p>
                <div className="flex items-center gap-2 text-gray-900">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(campaign.startDate).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha de finalización</p>
                <div className="flex items-center gap-2 text-gray-900">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(campaign.endDate).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Información adicional */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Creado por</span>
                <span className="text-gray-900 font-medium">{campaign.createdBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Fecha de creación</span>
                <span className="text-gray-900">
                  {new Date(campaign.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Última actualización</span>
                <span className="text-gray-900">
                  {new Date(campaign.updatedAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Ver Reportes
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Campaña
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
