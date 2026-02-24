'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { Input } from '@/components/ui-kit/Input'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'

interface Client {
  id: string
  companyId: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  ruc: string | null
  cedula: string | null
  contactName: string | null
  status: 'PROSPECTO' | 'PROPUESTA' | 'NEGOCIACION' | 'CALIFICADO' | 'ACTIVO' | 'INACTIVO'
  company: { name: string }
}

const STATUS_TABS = [
  { id: 'all', label: 'TODAS' },
  { id: 'PROSPECTO', label: 'PROSPECTO' },
  { id: 'PROPUESTA', label: 'PROPUESTA' },
  { id: 'NEGOCIACION', label: 'NEGOCIACIÓN' },
  { id: 'CALIFICADO', label: 'CALIFICADO' },
]

interface Company {
  id: string
  name: string
  logo: string | null
}

interface ClientRowDraft {
  tempId: number
  sourceId?: string
  companyId: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  ruc: string
  cedula: string
  contactName: string
  status: Client['status']
}

export default function ClientesPage() {
  const ITEMS_PER_PAGE = 10
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (typeof window === 'undefined') return 'all'
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || 'all'
  })
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importIncomes, setImportIncomes] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [draftRows, setDraftRows] = useState<ClientRowDraft[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, ClientRowDraft>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/clients?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setClients(data.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedStatus, searchTerm])

  useEffect(() => {
    fetchData()
    fetchCompanies()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedStatus, searchTerm])

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

  const handleImport = async () => {
    if (!importFile) {
      alert('Por favor selecciona un archivo')
      return
    }

    if (selectedCompany === 'all') {
      alert('Por favor selecciona una empresa')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('companyId', selectedCompany)
      formData.append('importIncomes', importIncomes.toString())

      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setImportResult(result.data)
        fetchData()
        setTimeout(() => {
          setShowImportModal(false)
          setImportFile(null)
          setImportIncomes(false)
          setImportResult(null)
        }, 5000)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Error al importar archivo')
    } finally {
      setIsImporting(false)
    }
  }

  const resolveDefaultCompanyId = () => {
    if (selectedCompany !== 'all') return selectedCompany
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    return activeCompany?.id || companies[0]?.id || ''
  }

  const addInlineRow = () => {
    const companyId = resolveDefaultCompanyId()
    if (!companyId) {
      alert('Selecciona una empresa antes de agregar una fila')
      return
    }

    setDraftRows((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        companyId,
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        ruc: '',
        cedula: '',
        contactName: '',
        status: 'PROSPECTO',
      },
    ])
  }

  const startEditingRow = (client: Client) => {
    setEditingRows((prev) => ({
      ...prev,
      [client.id]: {
        tempId: Date.now(),
        sourceId: client.id,
        companyId: client.companyId,
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || '',
        ruc: client.ruc || '',
        cedula: client.cedula || '',
        contactName: client.contactName || '',
        status: client.status,
      },
    }))
  }

  const cancelEditingRow = (clientId: string) => {
    setEditingRows((prev) => {
      const next = { ...prev }
      delete next[clientId]
      return next
    })
  }

  const updateDraftRow = (tempId: number, field: keyof ClientRowDraft, value: string) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, [field]: value } : row))
    )
  }

  const updateEditingRow = (clientId: string, field: keyof ClientRowDraft, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value,
      },
    }))
  }

  const saveRow = async (row: ClientRowDraft, mode: 'create' | 'update') => {
    if (!row.name || (mode === 'create' && !row.companyId)) {
      alert('Completa empresa y nombre del cliente')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const endpoint = mode === 'create' ? '/api/clients' : `/api/clients/${row.sourceId}`
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(mode === 'create' ? { companyId: row.companyId } : {}),
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          city: row.city,
          country: row.country,
          ruc: row.ruc,
          cedula: row.cedula,
          contactName: row.contactName,
          status: row.status,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo guardar el cliente')
        return
      }

      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        cancelEditingRow(row.sourceId)
      }

      fetchData()
    } catch (error) {
      console.error('Error saving client row:', error)
      alert('Error al guardar cliente')
    }
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: ClientRowDraft,
    mode: 'create' | 'update'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveRow(row, mode)
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      if (mode === 'create') {
        setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))
      } else if (row.sourceId) {
        handleDeleteClient(row.sourceId)
      }
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este cliente?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setClients((prev) => prev.filter((client) => client.id !== clientId))
      } else {
        alert(data.error || 'No se pudo eliminar el cliente')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error al eliminar cliente')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'warning' | 'success'> = {
      PROSPECTO: 'default',
      PROPUESTA: 'warning',
      NEGOCIACION: 'warning',
      CALIFICADO: 'success',
      ACTIVO: 'success',
      INACTIVO: 'default',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const totalPages = Math.max(1, Math.ceil(clients.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedClients = clients.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  )
  const showingFrom = clients.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1
  const showingTo = clients.length === 0 ? 0 : Math.min(safeCurrentPage * ITEMS_PER_PAGE, clients.length)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
        </div>
        <SkeletonTable rows={10} columns={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tu base de clientes, visualice estados y gestiona contactos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={addInlineRow}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AGREGAR FILA
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            IMPORTAR
          </Button>
          <Button variant="outline" onClick={() => router.push('/clientes/multiagregado')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            MULTIAGREGADO
          </Button>
          <Button onClick={() => router.push('/clientes/nuevo')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            NUEVO CLIENTE
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map(company => ({
              value: company.id,
              label: company.name
            }))
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-56"
        />
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Buscar cliente, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">UBICACIÓN</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">RUC/CÉDULA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONTACTO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ESTADO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row) => (
                <tr key={row.tempId} className="border-b border-blue-100 bg-blue-50/40">
                  <td className="py-2 px-2">
                    <select
                      value={row.companyId}
                      onChange={(e) => updateDraftRow(row.tempId, 'companyId', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateDraftRow(row.tempId, 'name', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Nombre del cliente"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="space-y-2">
                      <input
                        value={row.address}
                        onChange={(e) => updateDraftRow(row.tempId, 'address', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Dirección"
                      />
                      <input
                        value={row.city}
                        onChange={(e) => updateDraftRow(row.tempId, 'city', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ciudad"
                      />
                      <input
                        value={row.country}
                        onChange={(e) => updateDraftRow(row.tempId, 'country', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="País"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="space-y-2">
                      <input
                        value={row.ruc}
                        onChange={(e) => updateDraftRow(row.tempId, 'ruc', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="RUC"
                      />
                      <input
                        value={row.cedula}
                        onChange={(e) => updateDraftRow(row.tempId, 'cedula', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Cédula"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="space-y-2">
                      <input
                        value={row.contactName}
                        onChange={(e) => updateDraftRow(row.tempId, 'contactName', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Contacto"
                      />
                      <input
                        value={row.email}
                        onChange={(e) => updateDraftRow(row.tempId, 'email', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Email"
                      />
                      <input
                        value={row.phone}
                        onChange={(e) => updateDraftRow(row.tempId, 'phone', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="Teléfono"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateDraftRow(row.tempId, 'status', e.target.value)}
                      onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="PROSPECTO">Prospecto</option>
                      <option value="PROPUESTA">Propuesta</option>
                      <option value="NEGOCIACION">Negociación</option>
                      <option value="CALIFICADO">Calificado</option>
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" onClick={() => saveRow(row, 'create')}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setDraftRows((prev) => prev.filter((item) => item.tempId !== row.tempId))}>Quitar</Button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedClients.map((client) => (
                editingRows[client.id] ? (
                  <tr key={client.id} className="border-b border-blue-100 bg-blue-50/30">
                    <td className="py-2 px-2">
                      <div className="text-sm text-gray-700 px-2 py-2">
                        {client.company?.name || companies.find((c) => c.id === editingRows[client.id].companyId)?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={editingRows[client.id].name}
                        onChange={(e) => updateEditingRow(client.id, 'name', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="space-y-2">
                        <input
                          value={editingRows[client.id].address}
                          onChange={(e) => updateEditingRow(client.id, 'address', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Dirección"
                        />
                        <input
                          value={editingRows[client.id].city}
                          onChange={(e) => updateEditingRow(client.id, 'city', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Ciudad"
                        />
                        <input
                          value={editingRows[client.id].country}
                          onChange={(e) => updateEditingRow(client.id, 'country', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="País"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="space-y-2">
                        <input
                          value={editingRows[client.id].ruc}
                          onChange={(e) => updateEditingRow(client.id, 'ruc', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="RUC"
                        />
                        <input
                          value={editingRows[client.id].cedula}
                          onChange={(e) => updateEditingRow(client.id, 'cedula', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Cédula"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="space-y-2">
                        <input
                          value={editingRows[client.id].contactName}
                          onChange={(e) => updateEditingRow(client.id, 'contactName', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Contacto"
                        />
                        <input
                          value={editingRows[client.id].email}
                          onChange={(e) => updateEditingRow(client.id, 'email', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Email"
                        />
                        <input
                          value={editingRows[client.id].phone}
                          onChange={(e) => updateEditingRow(client.id, 'phone', e.target.value)}
                          onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="Teléfono"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={editingRows[client.id].status}
                        onChange={(e) => updateEditingRow(client.id, 'status', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, editingRows[client.id], 'update')}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="PROSPECTO">Prospecto</option>
                        <option value="PROPUESTA">Propuesta</option>
                        <option value="NEGOCIACION">Negociación</option>
                        <option value="CALIFICADO">Calificado</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => saveRow(editingRows[client.id], 'update')}>Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEditingRow(client.id)}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{client.company?.name || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{client.address || '-'}</div>
                        <div>{[client.city, client.country].filter(Boolean).join(', ') || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{client.ruc || client.cedula || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{client.contactName || '-'}</div>
                        <div>{client.email || '-'}</div>
                        <div>{client.phone || '-'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(client.status)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingRow(client)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        {clients.length === 0 && draftRows.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron clientes
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {showingFrom} a {showingTo} de {clients.length} resultados
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage <= 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Página {safeCurrentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage >= totalPages}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Modal de Importación */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Importar Clientes desde Excel</h2>
                <button 
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportResult(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!importResult ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Empresa
                    </label>
                    <Select
                      options={[
                        { value: 'all', label: 'Selecciona una empresa' },
                        ...companies.map(company => ({
                          value: company.id,
                          label: company.name
                        }))
                      ]}
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Archivo Excel
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      {!importFile ? (
                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600 mb-1">Click para seleccionar archivo</p>
                          <p className="text-xs text-gray-500">Formatos: .xlsx, .xls</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                            <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                          <button
                            onClick={() => setImportFile(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="importIncomes"
                      checked={importIncomes}
                      onChange={(e) => setImportIncomes(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="importIncomes" className="text-sm text-gray-700 cursor-pointer">
                      <span className="font-medium">Importar ingresos</span>
                      <span className="block text-xs text-gray-500 mt-1">
                        Si el archivo contiene datos de ingresos (folio, documento, montos), se importarán automáticamente
                      </span>
                    </label>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">📋 Información</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• El sistema detecta automáticamente las columnas del Excel</li>
                      <li>• Soporta múltiples formatos de columnas por empresa</li>
                      <li>• Los clientes duplicados serán omitidos</li>
                      <li>• Campos no reconocidos se guardan como datos personalizados</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <svg className="w-8 h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-green-900">¡Importación Exitosa!</h3>
                      <p className="text-sm text-green-700 mt-1">Los datos se han importado correctamente</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Clientes Importados</p>
                      <p className="text-2xl font-bold text-blue-600">{importResult.clients.imported}</p>
                      {importResult.clients.skipped > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{importResult.clients.skipped} omitidos (duplicados)</p>
                      )}
                    </div>

                    {importResult.hasIncomes && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Ingresos Importados</p>
                        <p className="text-2xl font-bold text-green-600">{importResult.incomes.imported}</p>
                        {importResult.incomes.skipped > 0 && (
                          <p className="text-xs text-gray-500 mt-1">{importResult.incomes.skipped} omitidos</p>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 text-center">Esta ventana se cerrará automáticamente en 5 segundos...</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportResult(null)
                }}
                disabled={isImporting}
              >
                Cancelar
              </Button>
              {!importResult && (
                <Button
                  onClick={handleImport}
                  disabled={!importFile || selectedCompany === 'all' || isImporting}
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importando...
                    </>
                  ) : (
                    'Importar'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
