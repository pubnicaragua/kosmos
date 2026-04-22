'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import * as XLSX from 'xlsx'
import { MarketingChart } from '@/components/ui-kit/MarketingChart'
import { Upload, X, FileText, ExternalLink, Image as ImageIcon, Film } from 'lucide-react'
import { useRef } from 'react'

interface Campaign {
  id: string
  name: string
  description?: string
  channel: string
  status: string
  budget: number | null
  spent: number
  startDate: string | null
  endDate: string | null
  targetAudience?: string
  metrics?: string
  adType?: string | null
  evidenceUrl?: string | null
  approvalStatus?: string | null
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

interface CampaignFormData {
  name: string
  description: string
  channel: string
  status: string
  budget: string
  spent: string
  startDate: string
  endDate: string
  targetAudience: string
  metrics: string
  adType: string
  evidenceUrl: string
}

export default function MarketingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    channel: 'REDES_SOCIALES',
    status: 'PLANIFICACION',
    budget: '',
    spent: '',
    startDate: '',
    endDate: '',
    targetAudience: '',
    metrics: '',
    adType: '',
    evidenceUrl: '',
  })
  const evidenceFileRef = useRef<HTMLInputElement>(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

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
      } catch (fetchError) {
        console.error('Error fetching campaign:', fetchError)
        setError('Error al cargar la campaña')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaign()
  }, [params.id, router])

  const hydrateFormData = (targetCampaign: Campaign) => {
    setFormData({
      name: targetCampaign.name,
      description: targetCampaign.description || '',
      channel: targetCampaign.channel,
      status: targetCampaign.status,
      budget: targetCampaign.budget !== null && targetCampaign.budget !== undefined ? String(targetCampaign.budget) : '',
      spent: targetCampaign.spent !== null && targetCampaign.spent !== undefined ? String(targetCampaign.spent) : '',
      startDate: targetCampaign.startDate ? targetCampaign.startDate.split('T')[0] : '',
      endDate: targetCampaign.endDate ? targetCampaign.endDate.split('T')[0] : '',
      targetAudience: targetCampaign.targetAudience || '',
      metrics: targetCampaign.metrics || '',
      adType: targetCampaign.adType || '',
      evidenceUrl: targetCampaign.evidenceUrl || '',
    })
  }

  const openEditModal = () => {
    if (!campaign) return
    hydrateFormData(campaign)
    setIsEditModalOpen(true)
  }

  const handleSaveCampaign = async (e: FormEvent) => {
    e.preventDefault()
    if (!campaign) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/marketing/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          channel: formData.channel,
          status: formData.status,
          budget: formData.budget && formData.budget.trim() !== '' ? Number(formData.budget) : null,
          spent: formData.spent && formData.spent.trim() !== '' ? Number(formData.spent) : null,
          startDate: formData.startDate && formData.startDate.trim() !== '' ? formData.startDate : null,
          endDate: formData.endDate && formData.endDate.trim() !== '' ? formData.endDate : null,
          targetAudience: formData.targetAudience || null,
          metrics: formData.metrics || null,
          adType: formData.adType || null,
          evidenceUrl: formData.evidenceUrl || null,
        }),
      })

      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'No se pudo actualizar la campaña')
        return
      }

      setCampaign(result.data)
      setIsEditModalOpen(false)
    } catch (saveError) {
      console.error('Error updating campaign:', saveError)
      alert('Error al actualizar campaña')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEvidenceUpload = async (file: File) => {
    setUploadingEvidence(true)
    try {
      const token = localStorage.getItem('accessToken')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, evidenceUrl: data.data.url }))
      } else {
        alert('Error al subir evidencia: ' + (data.error || 'Error desconocido'))
      }
    } catch {
      alert('Error al subir evidencia')
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('Enlace de campaña copiado al portapapeles')
    } catch (clipboardError) {
      console.error('Error sharing campaign:', clipboardError)
      alert('No se pudo copiar el enlace')
    }
  }

  const handleDeleteCampaign = async () => {
    if (!campaign) return
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta campaña?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/marketing/${campaign.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'No se pudo eliminar la campaña')
        return
      }

      router.push('/marketing')
    } catch (deleteError) {
      console.error('Error deleting campaign:', deleteError)
      alert('Error al eliminar campaña')
    }
  }

  const handleViewReports = () => {
    if (!campaign) return

    const safeBudget = campaign.budget || 0
    const execution = safeBudget > 0 ? (campaign.spent / safeBudget) * 100 : 0

    const rows = [
      { Campo: 'Campaña', Valor: campaign.name },
      { Campo: 'Canal', Valor: campaign.channel },
      { Campo: 'Estado', Valor: campaign.status },
      { Campo: 'Presupuesto', Valor: safeBudget },
      { Campo: 'Gastado', Valor: campaign.spent },
      { Campo: 'Disponible', Valor: safeBudget - campaign.spent },
      { Campo: '% Ejecución', Valor: Number(execution.toFixed(2)) },
      { Campo: 'Fecha Inicio', Valor: campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('es-ES') : '' },
      { Campo: 'Fecha Fin', Valor: campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('es-ES') : '' },
      { Campo: 'Tipo de anuncio', Valor: campaign.adType || '' },
      { Campo: 'URL de evidencia', Valor: campaign.evidenceUrl || '' },
      { Campo: 'Estado de aprobación', Valor: campaign.approvalStatus || 'PENDING' },
      { Campo: 'Creado por', Valor: campaign.createdByName || campaign.createdBy },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Reporte')
    XLSX.writeFile(workbook, `reporte_campana_${campaign.id}.xlsx`)
  }

  const handleExportPdf = () => {
    if (!campaign) return

    const safeBudget = campaign.budget || 0
    const execution = safeBudget > 0 ? (campaign.spent / safeBudget) * 100 : 0
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) return

    popup.document.write(`
      <html>
        <head>
          <title>Reporte ${campaign.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { margin: 4px 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${campaign.name}</h1>
          <p><strong>Canal:</strong> ${campaign.channel}</p>
          <p><strong>Estado:</strong> ${campaign.status}</p>
          <p><strong>Tipo de anuncio:</strong> ${campaign.adType || '-'}</p>
          <p><strong>Evidencia:</strong> ${campaign.evidenceUrl || '-'}</p>
          <p><strong>Aprobación:</strong> ${campaign.approvalStatus || 'PENDING'}</p>
          <p><strong>Creado por:</strong> ${campaign.createdByName || campaign.createdBy}</p>
          <table>
            <tr><th>Campo</th><th>Valor</th></tr>
            <tr><td>Presupuesto</td><td>${safeBudget.toLocaleString()}</td></tr>
            <tr><td>Gastado</td><td>${campaign.spent.toLocaleString()}</td></tr>
            <tr><td>Disponible</td><td>${(safeBudget - campaign.spent).toLocaleString()}</td></tr>
            <tr><td>% Ejecución</td><td>${execution.toFixed(2)}%</td></tr>
          </table>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

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

  const getApprovalStatusLabel = (approvalStatus?: string | null) => {
    const labels: Record<string, string> = {
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
      PENDING: 'Pendiente',
    }
    const normalizedStatus = approvalStatus || 'PENDING'
    return labels[normalizedStatus] || normalizedStatus
  }

  const getApprovalStatusColor = (approvalStatus?: string | null) => {
    const normalizedStatus = approvalStatus || 'PENDING'
    switch (normalizedStatus) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-amber-100 text-amber-800'
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

  const safeBudget = campaign.budget || 0
  const spentPercentage = safeBudget > 0 ? (campaign.spent / safeBudget) * 100 : 0

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
          <Badge className={getApprovalStatusColor(campaign.approvalStatus)}>
            {getApprovalStatusLabel(campaign.approvalStatus)}
          </Badge>
          <Button variant="outline" onClick={openEditModal}>
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

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tipo de anuncio</h3>
                <p className="text-gray-600">{campaign.adType || 'No definido'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Evidencia</h3>
                {campaign.evidenceUrl ? (
                  <div className="space-y-3">
                    <a
                      href={campaign.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm p-2 bg-primary/5 rounded-lg border border-primary/10 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver archivo de evidencia
                    </a>
                    
                    {/* Previsualización inteligente */}
                    {(() => {
                      const url = campaign.evidenceUrl?.toLowerCase() || ''
                      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                        return (
                          <div className="mt-2 relative group overflow-hidden rounded-xl border border-gray-200">
                            <img src={campaign.evidenceUrl!} alt="Evidencia" className="max-w-full h-auto max-h-[300px] object-contain bg-gray-50" />
                          </div>
                        )
                      }
                      if (url.match(/\.(mp4|webm|ogg)$/)) {
                        return (
                          <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden bg-black">
                            <video src={campaign.evidenceUrl!} controls className="max-w-full h-auto max-h-[300px]" />
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">No hay evidencia registrada para esta campaña.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Métricas</h3>
              {campaign.metrics ? (
                <MarketingChart metrics={campaign.metrics} type="bar" />
              ) : (
                <p className="text-sm text-gray-500">No hay métricas registradas</p>
              )}
            </div>
          </Card>

          {/* Presupuesto */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Presupuesto y Gastos</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Presupuesto Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${safeBudget.toLocaleString()}
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
                <span>Disponible: ${(safeBudget - campaign.spent).toLocaleString()}</span>
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
                  {campaign.startDate
                    ? new Date(campaign.startDate).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha de finalización</p>
                <div className="flex items-center gap-2 text-gray-900">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {campaign.endDate
                    ? new Date(campaign.endDate).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'}
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
                <span className="text-gray-900 font-medium">{campaign.createdByName || campaign.createdBy}</span>
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
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Aprobación</span>
                <Badge className={getApprovalStatusColor(campaign.approvalStatus)}>
                  {getApprovalStatusLabel(campaign.approvalStatus)}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleViewReports}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Exportar XLSX
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleExportPdf}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h6m-8 6h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Exportar PDF
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={handleDeleteCampaign}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Campaña
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Campaña"
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Canal"
              options={[
                { value: 'REDES_SOCIALES', label: 'Redes Sociales' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'PUBLICIDAD_DIGITAL', label: 'Publicidad Digital' },
                { value: 'CONTENIDO', label: 'Contenido' },
                { value: 'EVENTOS', label: 'Eventos' },
                { value: 'OTRO', label: 'Otro' },
              ]}
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              fullWidth
            />
            <Select
              label="Estado"
              options={[
                { value: 'PLANIFICACION', label: 'Planificación' },
                { value: 'EN_CURSO', label: 'En curso' },
                { value: 'PAUSADA', label: 'Pausada' },
                { value: 'COMPLETADA', label: 'Completada' },
                { value: 'CANCELADA', label: 'Cancelada' },
              ]}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Presupuesto"
              type="number"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              fullWidth
            />
            <Input
              label="Gastado"
              type="number"
              step="0.01"
              value={formData.spent}
              onChange={(e) => setFormData({ ...formData, spent: e.target.value })}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              fullWidth
            />
            <Input
              label="Fecha fin"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              fullWidth
            />
          </div>
          <Input
            label="Audiencia objetivo"
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            fullWidth
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Métricas <span className="text-xs text-gray-400 font-normal">(formato: Nombre: Valor, una por línea)</span>
            </label>
            <textarea
              value={formData.metrics}
              onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={5}
              placeholder={"Clicks: 1500\nImpresiones: 45000\nConversiones: 320\nCTR: 3.5\nROI: 210"}
            />
            <p className="text-xs text-gray-400 mt-1">Cada línea: <code>Nombre de métrica: valor numérico</code> — aparecerá en la gráfica de barras.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Tipo de anuncio"
              value={formData.adType}
              onChange={(e) => setFormData({ ...formData, adType: e.target.value })}
              fullWidth
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Evidencia de la Campaña</label>
              <div className="flex gap-2">
                <Input
                  value={formData.evidenceUrl}
                  onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
                  placeholder="URL o sube un archivo..."
                  fullWidth
                  className="flex-1"
                />
                <input
                  ref={evidenceFileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceUpload(f) }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => evidenceFileRef.current?.click()}
                  disabled={uploadingEvidence}
                  className="flex-shrink-0"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              {uploadingEvidence && <p className="text-[10px] text-blue-600 animate-pulse font-bold">Subiendo a Supabase...</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
