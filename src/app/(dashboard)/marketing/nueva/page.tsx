'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { ArrowLeft } from 'lucide-react'

export default function NuevaCampanaPage() {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('')
  const [companies, setCompanies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'REDES_SOCIALES',
    status: 'PLANIFICACION',
    budget: '',
    spent: '0',
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Presupuesto ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
                fullWidth
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Métricas</label>
              <textarea
                value={formData.metrics}
                onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
                placeholder="Ej: CTR: 2.5%, Conversiones: 150, ROI: 300%"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
              />
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
