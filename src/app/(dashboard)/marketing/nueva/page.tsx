'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { ArrowLeft, Upload, BarChart2, X } from 'lucide-react'

export default function NuevaCampanaPage() {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('')
  const [companies, setCompanies] = useState<any[]>([])
  const evidenceFileRef = useRef<HTMLInputElement>(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [evidenceFile, setEvidenceFile] = useState<{ name: string; url: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'REDES_SOCIALES',
    status: 'PLANIFICACION',
    budget: '',
    spent: '0',
    currency: 'USD',
    startDate: '',
    endDate: '',
    targetAudience: '',
    metrics: '',
    assignedTo: '',
  })

  useEffect(() => {
    const activeCompany = localStorage.getItem('activeCompany')
    if (activeCompany) {
      const company = JSON.parse(activeCompany)
      setSelectedCompany(company.id)
    }
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
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
        setEvidenceFile({ name: file.name, url: data.data.url })
      } else {
        alert('Error al subir evidencia: ' + (data.error || 'Error desconocido'))
      }
    } catch {
      alert('Error al subir evidencia')
    } finally {
      setUploadingEvidence(false)
    }
  }

  const parseMetrics = (raw: string): { label: string; value: number }[] => {
    return raw
      .split('\n')
      .map((line) => {
        const [label, val] = line.split(':')
        const value = parseFloat(val?.trim() || '0')
        return { label: label?.trim() || '', value: isNaN(value) ? 0 : value }
      })
      .filter((m) => m.label && m.value > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCompany) {
      alert('Seleccione una empresa')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/marketing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId: selectedCompany,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          spent: parseFloat(formData.spent),
          evidenceUrl: evidenceFile?.url || null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Campaña creada exitosamente')
        router.push('/marketing')
      } else {
        alert('Error al crear campaña: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error al crear campaña')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/marketing')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Campaña de Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">Crea una nueva campaña de marketing para tu empresa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
              <Select
                options={[
                  { value: '', label: 'Seleccionar empresa' },
                  ...companies.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                fullWidth
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Campaña *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Campaña Navidad 2024"
                fullWidth
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe los objetivos y detalles de la campaña"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canal *</label>
              <Select
                options={[
                  { value: 'REDES_SOCIALES', label: 'Redes Sociales' },
                  { value: 'EMAIL', label: 'Email Marketing' },
                  { value: 'PUBLICIDAD_DIGITAL', label: 'Publicidad Digital' },
                  { value: 'CONTENIDO', label: 'Marketing de Contenido' },
                  { value: 'EVENTOS', label: 'Eventos' },
                  { value: 'OTRO', label: 'Otro' },
                ]}
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                fullWidth
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <Select
                options={[
                  { value: 'PLANIFICACION', label: 'Planificación' },
                  { value: 'EN_CURSO', label: 'En Curso' },
                  { value: 'PAUSADA', label: 'Pausada' },
                  { value: 'COMPLETADA', label: 'Completada' },
                  { value: 'CANCELADA', label: 'Cancelada' },
                ]}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
              <Select
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'NIO', label: 'Córdobas (C$)' },
                ]}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Presupuesto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {formData.currency === 'NIO' ? 'C$' : '$'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                  className="pl-10"
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gastado ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.spent}
                onChange={(e) => setFormData({ ...formData, spent: e.target.value })}
                placeholder="0.00"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                fullWidth
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Audiencia Objetivo</label>
              <Input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Ej: Empresas B2B en Nicaragua"
                fullWidth
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Métricas
              </label>
              <textarea
                value={formData.metrics}
                onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
                placeholder="CTR: 2.5&#10;Conversiones: 150&#10;ROI: 300&#10;Alcance: 5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                rows={4}
              />
              <p className="text-xs text-gray-400 mt-1">Formato: Nombre: Valor (una métrica por línea)</p>
              {/* Mini preview de métricas como gráfica de barras */}
              {formData.metrics.trim() && (() => {
                const metrics = parseMetrics(formData.metrics)
                if (metrics.length === 0) return null
                const max = Math.max(...metrics.map((m) => m.value))
                return (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Vista previa</p>
                    <div className="space-y-2">
                      {metrics.map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0">{m.label}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                              className="h-4 rounded-full bg-primary transition-all"
                              style={{ width: `${(m.value / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-12 text-right flex-shrink-0">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Evidencia de la Campaña</label>
              <input
                ref={evidenceFileRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceUpload(f) }}
              />
              {evidenceFile ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Upload className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700 flex-1 truncate">{evidenceFile.name}</span>
                  <button type="button" onClick={() => setEvidenceFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => evidenceFileRef.current?.click()}
                  disabled={uploadingEvidence}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-500"
                >
                  <Upload className="w-5 h-5" />
                  {uploadingEvidence ? 'Subiendo...' : 'Subir evidencia (PDF, imagen, video, Excel, etc.)'}
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">Reportes, capturas de pantalla, análisis, comprobantes, etc.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => router.push('/marketing')}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Campaña
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
