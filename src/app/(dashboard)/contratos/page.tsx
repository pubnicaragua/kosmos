'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'

interface Contract {
  id: string
  contractId: string
  name: string
  concept: string
  category: string
  party: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'
  fileUrl: string
  uploadedBy: string
  company: { name: string }
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    contractId: '',
    name: '',
    concept: '',
    category: 'Operativo',
    party: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    fileUrl: '',
  })

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      params.append('page', currentPage.toString())
      params.append('limit', '10')

      const response = await fetch(`/api/contracts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setContracts(data.data.data || data.data)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedStatus, currentPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId: activeCompany.id,
          uploadedBy: user.email,
        }),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchData()
        setFormData({
          contractId: '',
          name: '',
          concept: '',
          category: 'Operativo',
          party: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          fileUrl: '',
        })
      }
    } catch (error) {
      console.error('Error creating contract:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'default'> = {
      ACTIVE: 'success',
      EXPIRING_SOON: 'warning',
      EXPIRED: 'default',
    }
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      EXPIRING_SOON: 'Por Vencer',
      EXPIRED: 'Vencido',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    const end = new Date(endDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    return `${start} - ${end}`
  }

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date()
    const expiry = new Date(endDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonTable rows={10} columns={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona contratos corporativos y recibe alertas de vencimiento.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DESCARGAR
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            NUEVO CONTRATO
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            { value: 'company1', label: 'Tech Solutions' },
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-56"
        />
      </div>

      {/* Alertas de Vencimiento */}
      {contracts.filter(c => c.status === 'EXPIRING_SOON').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-900">Contratos por Vencer</h3>
              <p className="text-sm text-yellow-800">
                Tienes {contracts.filter(c => c.status === 'EXPIRING_SOON').length} contrato(s) que vencen pronto. Revisa y renueva a tiempo.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            TODAS
          </button>
          <button
            onClick={() => setSelectedStatus('ACTIVE')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'ACTIVE'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ACTIVO
          </button>
          <button
            onClick={() => setSelectedStatus('EXPIRING_SOON')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'EXPIRING_SOON'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            POR VENCER
          </button>
          <button
            onClick={() => setSelectedStatus('EXPIRED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'EXPIRED'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            VENCIDO
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">ID CONTRATO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">NOMBRE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONCEPTO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONTRAPARTE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">VIGENCIA</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const daysUntilExpiry = getDaysUntilExpiry(contract.endDate)
                
                return (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{contract.company?.name || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-mono text-gray-900">{contract.contractId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{contract.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{contract.concept}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{contract.party}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{formatDateRange(contract.startDate, contract.endDate)}</div>
                      {contract.status === 'EXPIRING_SOON' && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Vence en {daysUntilExpiry} días
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-primary hover:text-primary-dark">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="text-error hover:text-error-dark">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {contracts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron contratos
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Contrato" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ID Contrato"
              value={formData.contractId}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              placeholder="CTR-2024-001"
              required
              fullWidth
            />
            <Input
              label="Nombre del Contrato"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
          </div>
          <Input
            label="Concepto"
            value={formData.concept}
            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
            required
            fullWidth
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            />
            <Input
              label="Contraparte"
              value={formData.party}
              onChange={(e) => setFormData({ ...formData, party: e.target.value })}
              required
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de Inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Fecha de Fin"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
              fullWidth
            />
          </div>
          <Input
            label="URL del Archivo"
            value={formData.fileUrl}
            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
            placeholder="/uploads/contracts/CTR-2024-001.pdf"
            fullWidth
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> En producción, aquí iría un componente de upload real para adjuntar el PDF del contrato.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Contrato
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
