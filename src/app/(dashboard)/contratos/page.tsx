'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { Upload } from 'lucide-react'

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

interface Company {
  id: string
  name: string
}

type ContractFormData = {
  contractId: string
  name: string
  concept: string
  category: string
  party: string
  startDate: string
  endDate: string
  fileUrl: string
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [formData, setFormData] = useState<ContractFormData>({
    contractId: '',
    name: '',
    concept: '',
    category: 'Operativo',
    party: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    fileUrl: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchCompanies = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)

        const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
        if (activeCompany?.id && (selectedCompany === 'all' || !selectedCompany)) {
          setSelectedCompany(activeCompany.id)
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [selectedCompany])

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
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetFormData = useCallback(() => {
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
  }, [])

  const openCreateModal = () => {
    setEditingContractId(null)
    resetFormData()
    setIsModalOpen(true)
  }

  const openEditModal = (contract: Contract) => {
    setEditingContractId(contract.id)
    setFormData({
      contractId: contract.contractId,
      name: contract.name,
      concept: contract.concept,
      category: contract.category || 'Operativo',
      party: contract.party,
      startDate: new Date(contract.startDate).toISOString().split('T')[0],
      endDate: new Date(contract.endDate).toISOString().split('T')[0],
      fileUrl: contract.fileUrl || '',
    })
    setIsModalOpen(true)
  }

  const handleFileUpload = async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('accessToken')
    if (!token) return null

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (data.success) return data.data.url
      alert(data.error || 'Error al subir archivo')
      return null
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error al subir archivo')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const fallbackCompanyId = activeCompany?.id || companies[0]?.id
    const targetCompanyId = selectedCompany !== 'all' ? selectedCompany : fallbackCompanyId

    if (!targetCompanyId && !editingContractId) {
      alert('Selecciona una empresa para guardar el contrato')
      return
    }

    let fileUrl = formData.fileUrl

    // Upload file if selected
    if (selectedFile) {
      const uploadedUrl = await handleFileUpload(selectedFile)
      if (!uploadedUrl) return
      fileUrl = uploadedUrl
    }

    try {
      const response = await fetch(editingContractId ? `/api/contracts/${editingContractId}` : '/api/contracts', {
        method: editingContractId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fileUrl,
          ...(editingContractId ? {} : { companyId: targetCompanyId }),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsModalOpen(false)
        setSelectedFile(null)
        fetchData()
      } else {
        alert(data.error || 'No se pudo guardar el contrato')
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      alert('Error al guardar contrato')
    }
  }

  const handleDelete = async (contractId: string) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este contrato?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setContracts((prev) => prev.filter((contract) => contract.id !== contractId))
      } else {
        alert(data.error || 'No se pudo eliminar el contrato')
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Error al eliminar contrato')
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.set('companyId', selectedCompany)

      const response = await fetch(`/api/contracts/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'No se pudo exportar')
        return
      }

      const rows = result.data.data as Array<Record<string, string | number | null>>
      if (!rows.length) {
        alert('No hay contratos para exportar')
        return
      }

      const headers = Object.keys(rows[0])
      const csvLines = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header] ?? ''
              const text = String(value).replace(/"/g, '""')
              return `"${text}"`
            })
            .join(',')
        ),
      ]

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', result.data.filename || `contratos_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting contracts:', error)
      alert('Error al exportar contratos')
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
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(endDate)
    expiry.setHours(0, 0, 0, 0)
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
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DESCARGAR
          </Button>
          <Button onClick={openCreateModal}>
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
            ...companies.map((company) => ({
              value: company.id,
              label: company.name,
            })),
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
                        <button className="text-primary hover:text-primary-dark" onClick={() => setViewingContract(contract)}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-gray-600 hover:text-gray-900" onClick={() => openEditModal(contract)}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="text-error hover:text-error-dark" onClick={() => handleDelete(contract.id)}>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContractId ? 'Editar Contrato' : 'Nuevo Contrato'}
        size="lg"
      >
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo del Contrato</label>
            <div className="flex gap-2">
              <Input
                placeholder="URL del contrato o sube uno..."
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                fullWidth
              />
              <div>
                <input
                  id="contract-file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setSelectedFile(file)
                  }}
                  disabled={uploading}
                />
                <label htmlFor="contract-file-upload" className="cursor-pointer inline-block">
                  <span className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                    uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}>
                    <Upload className="w-4 h-4 mr-1" />
                    {uploading ? 'Subiendo...' : 'Subir'}
                  </span>
                </label>
              </div>
            </div>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
            )}
          </div>
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
              {editingContractId ? 'Guardar Cambios' : 'Crear Contrato'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingContract}
        onClose={() => setViewingContract(null)}
        title={`Contrato ${viewingContract?.contractId || ''}`}
        size="md"
      >
        {viewingContract && (
          <div className="space-y-3 text-sm text-gray-700">
            <div><strong>Empresa:</strong> {viewingContract.company?.name || 'N/A'}</div>
            <div><strong>Nombre:</strong> {viewingContract.name}</div>
            <div><strong>Concepto:</strong> {viewingContract.concept}</div>
            <div><strong>Categoría:</strong> {viewingContract.category || 'N/A'}</div>
            <div><strong>Contraparte:</strong> {viewingContract.party}</div>
            <div><strong>Inicio:</strong> {new Date(viewingContract.startDate).toLocaleDateString('es-ES')}</div>
            <div><strong>Fin:</strong> {new Date(viewingContract.endDate).toLocaleDateString('es-ES')}</div>
            <div><strong>Estado:</strong> {viewingContract.status}</div>
            {viewingContract.fileUrl && (
              <div>
                <strong>Archivo:</strong>{' '}
                <a href={viewingContract.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Abrir documento
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
