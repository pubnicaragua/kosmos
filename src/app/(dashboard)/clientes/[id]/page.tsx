'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { ArrowLeft, Mail, Phone, MapPin, Building2, User, Calendar, Edit, Trash2, FileText, Plus } from 'lucide-react'
import { formatCedula, formatRuc, validateCedula, validateRuc } from '@/lib/nicaragua-validators'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { QUOTE_PIPELINE_STAGE_LABELS, type QuotePipelineStage } from '@/lib/quote-pipeline'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  industry: string | null
  status: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  ruc?: string | null
  cedula?: string | null
  contactName?: string | null
  company?: { id: string; name: string } | null
}

const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  PROSPECTO: 'Prospecto',
  PROPUESTA: 'Propuesta',
  NEGOCIACION: 'Negociación',
  CALIFICADO: 'Calificado',
}

interface Quote {
  id: string
  quoteNumber: string
  pipelineStage: QuotePipelineStage
  total: number
  createdAt: string
  expiresAt: string | null
}

interface Contract {
  id: string
  contractId: string
  name: string
  status: string
  startDate: string
  endDate: string
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const permissions = useModulePermissions('clientes', { requireAction: 'view' })
  const cotizacionesPermissions = useModulePermissions('cotizaciones')
  const [client, setClient] = useState<Client | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Client>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/clients/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            router.push('/login')
            return
          }
          if (response.status === 404) {
            setError('Cliente no encontrado')
          } else if (response.status === 403) {
            setError('No tienes acceso a este cliente')
          } else {
            setError('Error al cargar el cliente')
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        const clientData = data.data || data
        setClient(clientData)
        setEditData(clientData)
        
        // Fetch quotes
        const quotesRes = await fetch(`/api/quotes?clientId=${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (quotesRes.ok) {
          const quotesData = await quotesRes.json()
          setQuotes(quotesData.data || [])
        }
        
        // Fetch contracts
        const contractsRes = await fetch(`/api/contracts?clientId=${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (contractsRes.ok) {
          const contractsData = await contractsRes.json()
          setContracts(contractsData.data || [])
        }
      } catch (err) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchClient()
    }
  }, [params.id, router])

  const checkFieldUniqueness = async (field: 'ruc' | 'cedula') => {
    const val = field === 'ruc' ? editData.ruc : editData.cedula
    if (!val || !client?.company?.id) return
    const sp = new URLSearchParams({ companyId: client.company.id })
    sp.append(field, val)
    sp.append('excludeId', params.id as string)
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch(`/api/clients/check-cedula-ruc?${sp}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data.conflicts.length > 0) {
        setFieldErrors(prev => ({ ...prev, [field]: data.data.conflicts[0] || '' }))
      } else {
        setFieldErrors(prev => ({ ...prev, [field]: '' }))
      }
    } catch {}
  }

  const handleFieldBlur = (field: 'ruc' | 'cedula') => {
    const val = field === 'ruc' ? editData.ruc : editData.cedula
    if (!val) return
    const validator = field === 'ruc' ? validateRuc : validateCedula
    const fmt = validator(val)
    if (!fmt.valid) {
      setFieldErrors(prev => ({ ...prev, [field]: fmt.message || '' }))
      return
    }
    setFieldErrors(prev => ({ ...prev, [field]: '' }))
    checkFieldUniqueness(field)
  }

  const hasBlockingErrors = Object.values(fieldErrors).some(err => err !== '')

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      if (editData.ruc || editData.cedula) {
        const sp = new URLSearchParams({ companyId: client?.company?.id || '' })
        if (editData.ruc) sp.append('ruc', editData.ruc)
        if (editData.cedula) sp.append('cedula', editData.cedula)
        sp.append('excludeId', params.id as string)

        const checkRes = await fetch(`/api/clients/check-cedula-ruc?${sp}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const checkData = await checkRes.json()
        if (checkData.success && checkData.data.conflicts.length > 0) {
          alert(checkData.data.conflicts.join('. '))
          return
        }
      }

      setIsSaving(true)
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        const data = await response.json()
        setClient(data.data || data)
        setIsEditing(false)
        alert('Cliente actualizado correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al actualizar el cliente')
      }
    } catch (err) {
      alert('Error de conexión')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(client || {})
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/clientes')
      } else {
        alert('Error al eliminar el cliente')
      }
    } catch (err) {
      alert('Error de conexión')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/clientes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Cliente no encontrado'}</p>
        </div>
      </div>
    )
  }

  const normalizedStatus = (client.status || '').toUpperCase()
  const statusLabel = CLIENT_STATUS_LABELS[normalizedStatus] || client.status
  const statusClass =
    normalizedStatus === 'ACTIVO'
      ? 'bg-green-100 text-green-800 border border-green-200'
      : normalizedStatus === 'INACTIVO'
      ? 'bg-gray-100 text-gray-800 border border-gray-200'
      : normalizedStatus === 'NEGOCIACION' || normalizedStatus === 'PROPUESTA'
      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      : 'bg-blue-100 text-blue-800 border border-blue-200'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/clientes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </button>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              {permissions.canEdit && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || hasBlockingErrors}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isSaving || hasBlockingErrors ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              )}
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {permissions.canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions.canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="text-3xl font-bold text-slate-900 mb-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del cliente"
              />
            ) : (
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{client.name}</h1>
            )}
            <div className="flex items-center gap-3">
              <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold ${statusClass}`}>
                {statusLabel}
              </span>
              <span className="text-sm text-slate-500">
                Cliente desde {new Date(client.createdAt).toLocaleDateString('es-NI', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <User className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Contacto Principal</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.contactName || ''}
                  onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del contacto"
                />
              ) : (
                <p className="text-base font-medium text-slate-900">{client.contactName || 'No especificado'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Correo Electrónico</p>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                />
              ) : (
                <a href={`mailto:${client.email}`} className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  {client.email || 'No especificado'}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">WhatsApp / Teléfono</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8866-1292"
                />
              ) : (
                client.phone ? (
                  <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-base font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    {client.phone}
                  </a>
                ) : (
                  <p className="text-base font-medium text-slate-900">No especificado</p>
                )
              )}
            </div>
          </div>

          {!isEditing && !client.ruc && !client.cedula && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">RUC / Cédula</p>
                <p className="text-base font-medium text-slate-900">No especificado</p>
              </div>
            </div>
          )}

          {(isEditing || client.ruc) && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">RUC</p>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editData.ruc || ''}
                      onChange={(e) => { setEditData({ ...editData, ruc: formatRuc(e.target.value) }); setFieldErrors(prev => { const n = { ...prev }; delete n.ruc; return n }) }}
                      onBlur={() => handleFieldBlur('ruc')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldErrors.ruc ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      placeholder="J0310000000000"
                    />
                    {fieldErrors.ruc && <p className="mt-1 text-xs text-red-500">{fieldErrors.ruc}</p>}
                  </>
                ) : (
                  <p className="text-base font-medium text-slate-900">{client.ruc}</p>
                )}
              </div>
            </div>
          )}

          {(isEditing || client.cedula) && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cédula</p>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editData.cedula || ''}
                      onChange={(e) => { setEditData({ ...editData, cedula: formatCedula(e.target.value) }); setFieldErrors(prev => { const n = { ...prev }; delete n.cedula; return n }) }}
                      onBlur={() => handleFieldBlur('cedula')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldErrors.cedula ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      placeholder="000-000000-0000A"
                    />
                    {fieldErrors.cedula && <p className="mt-1 text-xs text-red-500">{fieldErrors.cedula}</p>}
                  </>
                ) : (
                  <p className="text-base font-medium text-slate-900">{client.cedula}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dirección</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección completa"
                />
              ) : (
                <p className="text-base font-medium text-slate-900">{client.address || 'No especificada'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ciudad</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.city || ''}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Managua"
                />
              ) : (
                <p className="text-base font-medium text-slate-900">{client.city || 'No especificada'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">País</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.country || ''}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nicaragua"
                />
              ) : (
                <p className="text-base font-medium text-slate-900">{client.country || 'No especificado'}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <Building2 className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Empresa Asignada</p>
              <p className="text-base font-medium text-slate-900">{client.company?.name || 'No asignada'}</p>
            </div>
          </div>

          {client.industry && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <Building2 className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Industria</p>
                <p className="text-base font-medium text-slate-900">{client.industry}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Última Actualización</p>
              <p className="text-base font-medium text-slate-900">{new Date(client.updatedAt).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Section */}
      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Cotizaciones</h2>
          {cotizacionesPermissions.canCreate && (
            <Button
              onClick={() => router.push(`/clientes/cotizacion/nueva?clientId=${client.id}&companyId=${client.company?.id || ''}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cotización
            </Button>
          )}
        </div>
        {quotes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No hay cotizaciones para este cliente</p>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => router.push(`/clientes/cotizacion/${quote.id}`)}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{quote.quoteNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(quote.createdAt).toLocaleDateString('es-ES')}
                      {quote.expiresAt && ` - Vence: ${new Date(quote.expiresAt).toLocaleDateString('es-ES')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold text-gray-900">${quote.total.toLocaleString()}</p>
                  <Badge variant={quote.pipelineStage === 'REALIZADA' ? 'success' : quote.pipelineStage === 'RECHAZADA' ? 'default' : 'warning'}>
                    {QUOTE_PIPELINE_STAGE_LABELS[quote.pipelineStage]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Contracts Section */}
      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Contratos</h2>
        </div>
        {contracts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No hay contratos para este cliente</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{contract.name}</p>
                    <p className="text-sm text-gray-500">
                      {contract.contractId} - {new Date(contract.startDate).toLocaleDateString('es-ES')} a {new Date(contract.endDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <Badge variant={contract.status === 'ACTIVE' ? 'success' : contract.status === 'EXPIRED' ? 'default' : 'warning'}>
                  {contract.status === 'ACTIVE' ? 'Activo' : contract.status === 'EXPIRED' ? 'Vencido' : 'Por Vencer'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
