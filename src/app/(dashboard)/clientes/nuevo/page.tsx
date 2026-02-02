'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { ArrowLeft } from 'lucide-react'

export default function NuevoClientePage() {
  const router = useRouter()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCompany) {
      alert('Seleccione una empresa')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

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
        alert('Cliente creado exitosamente')
        router.push('/clientes')
      } else {
        alert('Error al crear cliente: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Error al crear cliente')
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Empresa ABC S.A."
                fullWidth
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@empresa.com"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+505 8888-8888"
                fullWidth
              />
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
                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                placeholder="J0310000000000"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cédula</label>
              <Input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                placeholder="001-010101-0001A"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Contacto</label>
              <Input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Juan Pérez"
                fullWidth
              />
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

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => router.push('/clientes')}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Cliente
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
