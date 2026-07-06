'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { ArrowLeft } from 'lucide-react'
import { formatCedula, formatRuc, validateCedula, validateRuc } from '@/lib/nicaragua-validators'
import { useModulePermissions } from '@/hooks/useModulePermissions'

export default function NuevoClientePage() {
  const router = useRouter()
  const permissions = useModulePermissions('clientes', { requireAction: 'create' })
  const [selectedCompany, setSelectedCompany] = useState('')
  const [companies, setCompanies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Nicaragua',
    ruc: '',
    cedula: '',
    taxId: '',
    contactName: '',
    status: 'PROSPECTO',
    notes: '',
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

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!selectedCompany) errs.company = 'Seleccione una empresa'
    if (!formData.name.trim()) errs.name = 'El nombre del cliente es obligatorio'
    if (!formData.contactName.trim()) errs.contactName = 'El nombre de contacto es obligatorio'
    if (!formData.email.trim()) {
      errs.email = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Correo electrónico inválido'
    }
    if (!formData.phone.trim()) {
      errs.phone = 'El teléfono es obligatorio'
    } else if (!/^[+]?[\d\s\-()]{7,20}$/.test(formData.phone.trim())) {
      errs.phone = 'Teléfono inválido (mínimo 7 dígitos)'
    }
    if (formData.ruc.trim()) {
      const rucVal = validateRuc(formData.ruc)
      if (!rucVal.valid) errs.ruc = rucVal.message || 'RUC inválido'
    }
    if (formData.cedula.trim()) {
      const cedVal = validateCedula(formData.cedula)
      if (!cedVal.valid) errs.cedula = cedVal.message || 'Cédula inválida'
    }
    return errs
  }

  const checkUniqueness = async (): Promise<string | null> => {
    if (!formData.ruc && !formData.cedula) return null

    const params = new URLSearchParams({ companyId: selectedCompany })
    if (formData.ruc) params.append('ruc', formData.ruc)
    if (formData.cedula) params.append('cedula', formData.cedula)

    const token = localStorage.getItem('accessToken')
    if (!token) return null

    try {
      const response = await fetch(`/api/clients/check-cedula-ruc?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success && data.data.conflicts.length > 0) {
        return data.data.conflicts.join('. ')
      }
    } catch (e) {
      console.error('Error checking uniqueness:', e)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const conflictMsg = await checkUniqueness()
    if (conflictMsg) {
      setErrors({ general: conflictMsg })
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId: selectedCompany,
        }),
      })

      const data = await response.json()
      if (data.success) {
        router.push('/clientes')
      } else {
        setErrors({ general: data.error || data.message || 'No se pudo crear el cliente' })
      }
    } catch (error) {
      console.error('Error creating client:', error)
      setErrors({ general: 'Error de conexión al crear cliente' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nuevo Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">Registra un nuevo cliente en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
              <Select
                options={[
                  { value: '', label: 'Seleccionar empresa' },
                  ...companies.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={selectedCompany}
                onChange={(e) => { setSelectedCompany(e.target.value); setErrors(prev => ({ ...prev, company: '' })) }}
                fullWidth
              />
              {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })) }}
                placeholder="Ej: Empresa ABC S.A."
                fullWidth
                className={errors.name ? 'border-red-400' : ''}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors(prev => ({ ...prev, email: '' })) }}
                placeholder="contacto@empresa.com"
                fullWidth
                className={errors.email ? 'border-red-400' : ''}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: '' })) }}
                placeholder="+505 8888-8888"
                fullWidth
                className={errors.phone ? 'border-red-400 focus:ring-red-200' : ''}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección completa"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Managua"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Nicaragua"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RUC</label>
              <Input
                type="text"
                value={formData.ruc}
                onChange={(e) => { const v = formatRuc(e.target.value); setFormData({ ...formData, ruc: v }); setErrors(prev => ({ ...prev, ruc: '' })) }}
                placeholder="J0310000000000"
                fullWidth
                className={errors.ruc ? 'border-red-400' : ''}
              />
              {errors.ruc && <p className="mt-1 text-sm text-red-600">{errors.ruc}</p>}
              {formData.ruc && !errors.ruc && validateRuc(formData.ruc).valid === false && <p className="mt-1 text-xs text-red-500">{validateRuc(formData.ruc).message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cédula</label>
              <Input
                type="text"
                value={formData.cedula}
                onChange={(e) => { const v = formatCedula(e.target.value); setFormData({ ...formData, cedula: v }); setErrors(prev => ({ ...prev, cedula: '' })) }}
                placeholder="001-010101-0001A"
                fullWidth
                className={errors.cedula ? 'border-red-400' : ''}
              />
              {errors.cedula && <p className="mt-1 text-sm text-red-600">{errors.cedula}</p>}
              {formData.cedula && !errors.cedula && validateCedula(formData.cedula).valid === false && <p className="mt-1 text-xs text-red-500">{validateCedula(formData.cedula).message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Contacto *</label>
              <Input
                type="text"
                value={formData.contactName}
                onChange={(e) => { setFormData({ ...formData, contactName: e.target.value }); setErrors(prev => ({ ...prev, contactName: '' })) }}
                placeholder="Juan Pérez"
                fullWidth
                className={errors.contactName ? 'border-red-400' : ''}
              />
              {errors.contactName && <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <Select
                options={[
                  { value: 'PROSPECTO', label: 'Prospecto' },
                  { value: 'PROPUESTA', label: 'Propuesta' },
                  { value: 'NEGOCIACION', label: 'Negociación' },
                  { value: 'CALIFICADO', label: 'Calificado' },
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'INACTIVO', label: 'Inactivo' },
                ]}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                fullWidth
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre el cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={4}
              />
            </div>
          </div>

          {errors.general && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => router.push('/clientes')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Crear Cliente'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
