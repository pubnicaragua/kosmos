'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { Input } from '@/components/ui-kit/Input'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { formatCedula, formatRuc, validateCedula, validateRuc } from '@/lib/nicaragua-validators'
import { useModulePermissions } from '@/hooks/useModulePermissions'

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
  createdAt?: string
  updatedAt?: string
  company: { name: string }
}

const STATUS_LABELS: Record<Client['status'], string> = {
  PROSPECTO: 'Prospecto',
  PROPUESTA: 'Propuesta',
  NEGOCIACION: 'Negociación',
  CALIFICADO: 'Calificado',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
}

const STATUS_TABS = [
  { id: 'all', label: 'TODAS' },
  { id: 'ACTIVO', label: 'ACTIVO' },
  { id: 'INACTIVO', label: 'INACTIVO' },
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

function ClientesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const permissions = useModulePermissions('clientes', { requireAction: 'view' })
  const editClientId = searchParams.get('edit')
  const [itemsPerPage, setItemsPerPage] = useState(25)
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
  const [filterCity, setFilterCity] = useState('')
  const [filterRuc, setFilterRuc] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importIncomes, setImportIncomes] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState<any>(null)
  const [draftRows, setDraftRows] = useState<ClientRowDraft[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, ClientRowDraft>>({})
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [quickViewClient, setQuickViewClient] = useState<any>(null)
  const [quickViewDetails, setQuickViewDetails] = useState<any>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [isQuickViewLoading, setIsQuickViewLoading] = useState(false)
  const [quickViewTab, setQuickViewTab] = useState<'resumen' | 'actividad' | 'documentos' | 'historial'>('resumen')
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

  useEffect(() => {
    if (editClientId && clients.length > 0) {
      const clientToEdit = clients.find(c => c.id === editClientId)
      if (clientToEdit) {
        startEditingRow(clientToEdit)
        // Clear the query param after triggering edit
        router.replace('/clientes')
      }
    }
  }, [editClientId, clients])

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
    setImportProgress({ current: 0, total: 0 })
    let progressInterval: ReturnType<typeof setInterval> | null = null

    try {
      // Read file to get total count for progress
      const XLSX = await import('xlsx')
      const arrayBuffer = await importFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(firstSheet)
      
      setImportProgress({ current: 0, total: data.length })

      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('companyId', selectedCompany)
      formData.append('importIncomes', importIncomes.toString())

      const token = localStorage.getItem('accessToken')
      
      // Simulate progress updates (since API doesn't support streaming)
      progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const target = Math.max(1, Math.floor(prev.total * 0.9))
          if (prev.current < target) {
            return { ...prev, current: Math.min(prev.current + Math.ceil(prev.total / 15), target) }
          }
          return prev
        })
      }, 500)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const result = await response.json()

      if (result.success) {
        setImportProgress({ current: data.length, total: data.length })
        setImportResult(result.data)
        fetchData()
        setTimeout(() => {
          setShowImportModal(false)
          setImportFile(null)
          setImportIncomes(false)
          setImportResult(null)
          setImportProgress({ current: 0, total: 0 })
        }, 5000)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert(
        error instanceof Error && error.name === 'AbortError'
          ? 'La importación tardó demasiado. Intenta dividir el archivo en lotes más pequeños.'
          : 'Error al importar archivo'
      )
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
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
    let processedValue = value
    if (field === 'cedula') processedValue = formatCedula(value)
    if (field === 'ruc') processedValue = formatRuc(value)
    
    setDraftRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, [field]: processedValue } : row))
    )
  }

  const updateEditingRow = (clientId: string, field: keyof ClientRowDraft, value: string) => {
    let processedValue = value
    if (field === 'cedula') processedValue = formatCedula(value)
    if (field === 'ruc') processedValue = formatRuc(value)
    
    setEditingRows((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: processedValue,
      },
    }))
  }

  const saveRow = async (row: ClientRowDraft, mode: 'create' | 'update') => {
    if (!row.name || (mode === 'create' && !row.companyId)) {
      alert('Completa empresa y nombre del cliente')
      return
    }

    if (!row.email || !row.contactName || !row.phone) {
      alert('Email, nombre de contacto y teléfono son obligatorios')
      return
    }

    const cedulaValidation = validateCedula(row.cedula)
    if (!cedulaValidation.valid) {
      alert('Cédula inválida: ' + cedulaValidation.message)
      return
    }

    const rucValidation = validateRuc(row.ruc)
    if (!rucValidation.valid) {
      alert('RUC inválido: ' + rucValidation.message)
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

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const toggleAllClients = () => {
    if (selectedClients.size === paginatedClients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(paginatedClients.map((c) => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar ${selectedClients.size} cliente(s)? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const deletePromises = Array.from(selectedClients).map((clientId) =>
        fetch(`/api/clients/${clientId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      )

      await Promise.all(deletePromises)
      setSelectedClients(new Set())
      fetchData()
      alert(`${selectedClients.size} cliente(s) eliminado(s) exitosamente`)
    } catch (error) {
      console.error('Error deleting clients:', error)
      alert('Error al eliminar clientes')
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
    const confirmed = window.confirm('¿Seguro que deseas marcar este cliente como inactivo?')
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
        // Update status to INACTIVO instead of removing
        setClients((prev) => prev.map((client) => 
          client.id === clientId ? { ...client, status: 'INACTIVO' } : client
        ))
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
    return <Badge variant={variants[status] || 'default'}>{STATUS_LABELS[status as Client['status']] || status}</Badge>
  }

  const openQuickView = async (client: Client) => {
    setQuickViewClient(client)
    setQuickViewDetails(null)
    setIsQuickViewLoading(true)

    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsQuickViewLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setQuickViewDetails(data.data)
      }
    } catch (error) {
      console.error('Error loading client quick view:', error)
    } finally {
      setIsQuickViewLoading(false)
    }
  }

  const closeQuickView = () => {
    setQuickViewClient(null)
    setQuickViewDetails(null)
  }

  // Aplicar filtros de columna
  const filteredClients = clients.filter(client => {
    if (filterCity && !client.city?.toLowerCase().includes(filterCity.toLowerCase())) return false
    if (filterRuc) {
      const rucMatch = client.ruc?.toLowerCase().includes(filterRuc.toLowerCase())
      const cedulaMatch = client.cedula?.toLowerCase().includes(filterRuc.toLowerCase())
      if (!rucMatch && !cedulaMatch) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedClients = filteredClients.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  )
  const showingFrom = filteredClients.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
  const showingTo = filteredClients.length === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, filteredClients.length)

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
          {selectedClients.size > 0 && permissions.canDelete && (
            <Button variant="outline" onClick={handleBulkDelete} className="bg-red-50 text-red-600 border-red-300 hover:bg-red-100">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ELIMINAR ({selectedClients.size})
            </Button>
          )}
          {permissions.canCreate && (
            <>
              <Button onClick={addInlineRow}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                AGREGAR FILA
              </Button>
              <Button onClick={() => setShowImportModal(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                IMPORTAR
              </Button>
              <Button onClick={() => router.push('/clientes/nuevo')}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                NUEVO CLIENTE
              </Button>
            </>
          )}
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
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide"></th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">RUC / CÉDULA</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">WHATSAPP</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide"></th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">ÚLTIMA ACTIVIDAD</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row) => (
                <tr key={row.tempId} className="border-b border-blue-100 bg-blue-50/40">
                  <td className="py-2 px-2"></td>
                  {selectedCompany === 'all' && (
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
                  )}
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
                    <div className="space-y-1">
                      <input
                        value={row.ruc}
                        onChange={(e) => updateDraftRow(row.tempId, 'ruc', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                          row.ruc && !validateRuc(row.ruc).valid ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="RUC (J0310000000000)"
                      />
                      {row.ruc && !validateRuc(row.ruc).valid && (
                        <p className="text-xs text-red-500">{validateRuc(row.ruc).message}</p>
                      )}
                      <input
                        value={row.cedula}
                        onChange={(e) => updateDraftRow(row.tempId, 'cedula', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                          row.cedula && !validateCedula(row.cedula).valid ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Cédula (001-010190-0001A)"
                      />
                      {row.cedula && !validateCedula(row.cedula).valid && (
                        <p className="text-xs text-red-500">{validateCedula(row.cedula).message}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="space-y-1">
                      <input
                        value={row.contactName}
                        onChange={(e) => updateDraftRow(row.tempId, 'contactName', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                          !row.contactName ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                        }`}
                        placeholder="Contacto *"
                      />
                      {!row.contactName && <p className="text-xs text-orange-500">Requerido</p>}
                      <input
                        value={row.email}
                        onChange={(e) => updateDraftRow(row.tempId, 'email', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                          !row.email ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                        }`}
                        placeholder="Email *"
                      />
                      {!row.email && <p className="text-xs text-orange-500">Requerido</p>}
                      <input
                        value={row.phone}
                        onChange={(e) => updateDraftRow(row.tempId, 'phone', e.target.value)}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'create')}
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                          !row.phone ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                        }`}
                        placeholder="Teléfono *"
                      />
                      {!row.phone && <p className="text-xs text-orange-500">Requerido</p>}
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

              {paginatedClients.map((client) => {
                const initials = client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500']
                const colorIndex = client.name.charCodeAt(0) % avatarColors.length
                
                return editingRows[client.id] ? (
                  <tr key={client.id} className="border-b border-blue-100 bg-blue-50/30">
                    <td className="py-2 px-2"></td>
                    {selectedCompany === 'all' && (
                      <td className="py-2 px-2">
                        <div className="text-sm text-gray-700 px-2 py-2">
                          {client.company?.name || companies.find((c) => c.id === editingRows[client.id].companyId)?.name || 'N/A'}
                        </div>
                      </td>
                    )}
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
                  <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${avatarColors[colorIndex]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <button
                            onClick={() => router.push(`/clientes/${client.id}`)}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {client.name}
                          </button>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{client.address || 'Ubicación no registrada'}</span>
                            <span className="mx-1">•</span>
                            <span>{client.city || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {client.ruc && <div className="text-sm text-slate-700">RUC: {client.ruc}</div>}
                      {client.cedula && <div className="text-sm text-slate-700">Cédula: {client.cedula}</div>}
                      {!client.ruc && !client.cedula && <div className="text-sm text-slate-400">N/A</div>}
                    </td>
                    <td className="py-3 px-4">
                      {client.phone ? (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          <span>{client.phone}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">—</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Última actividad</span>
                      </div>
                      <div className="text-sm text-slate-700 mt-0.5">
                        {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Hoy, 09:14'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openQuickView(client)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Más opciones"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                          </button>
                          {menuOpenId === client.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                              {permissions.canEdit && (
                                <button
                                  onClick={() => {
                                    startEditingRow(client)
                                    setMenuOpenId(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Editar cliente
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  router.push(`/clientes/${client.id}`)
                                  setMenuOpenId(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver detalle
                              </button>
                              {client.status === 'INACTIVO' ? (
                                <>
                                  {permissions.canEdit && (
                                    <button
                                      onClick={async () => {
                                        const token = localStorage.getItem('accessToken')
                                        if (!token) return
                                        try {
                                          const response = await fetch(`/api/clients/${client.id}`, {
                                            method: 'PUT',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ status: 'ACTIVO' }),
                                          })
                                          const data = await response.json()
                                          if (data.success) {
                                            setClients((prev) => prev.map((c) => 
                                              c.id === client.id ? { ...c, status: 'ACTIVO' } : c
                                            ))
                                          }
                                        } catch (error) {
                                          console.error('Error reactivating client:', error)
                                        }
                                        setMenuOpenId(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Reactivar
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  {permissions.canDelete && (
                                    <button
                                      onClick={() => {
                                        handleDeleteClient(client.id)
                                        setMenuOpenId(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Eliminar
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Mostrando {showingFrom} a {showingTo} de {clients.length} resultados
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="150">150</option>
            </select>
          </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Archivo Excel
                      </label>
                      <button
                        onClick={async () => {
                          const XLSX = await import('xlsx')
                          const template = [
                            { Nombre: 'Juan Pérez García', Email: 'juan.perez@empresa.com', Telefono: '8888-1234', Empresa: 'Constructora El Sol', RUC: 'J0310000012345', Direccion: 'Managua, Nicaragua', Tipo: 'Corporativo', Estado: 'Activo' },
                            { Nombre: 'María López Hernández', Email: 'maria.lopez@comercial.com', Telefono: '8777-5678', Empresa: 'Comercial López', RUC: 'J0310000023456', Direccion: 'León, Nicaragua', Tipo: 'Corporativo', Estado: 'Activo' },
                            { Nombre: 'Carlos Martínez Ruiz', Email: 'carlos@tech.ni', Telefono: '8666-9012', Empresa: 'Tech Solutions NI', RUC: 'J0310000034567', Direccion: 'Granada, Nicaragua', Tipo: 'Corporativo', Estado: 'Activo' },
                            { Nombre: 'Ana Rodríguez Castro', Email: 'ana.rodriguez@gmail.com', Telefono: '8555-3456', Empresa: '', RUC: '', Direccion: 'Masaya, Nicaragua', Tipo: 'Individual', Estado: 'Activo' },
                            { Nombre: 'Roberto Sánchez Morales', Email: 'roberto.sanchez@hotmail.com', Telefono: '8444-7890', Empresa: 'Distribuidora Central', RUC: 'J0310000045678', Direccion: 'Estelí, Nicaragua', Tipo: 'Corporativo', Estado: 'Prospecto' }
                          ]
                          const wb = XLSX.utils.book_new()
                          const ws = XLSX.utils.json_to_sheet(template)
                          XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
                          XLSX.writeFile(wb, 'plantilla_clientes_kosmos.xlsx')
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Plantilla
                      </button>
                    </div>
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
                <>
                  {isImporting && importProgress.total > 0 && (
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Procesando clientes...</span>
                        <span className="font-semibold text-primary">
                          {importProgress.current} / {importProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || selectedCompany === 'all' || isImporting}
                  >
                    {isImporting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Importando...
                      </div>
                    ) : (
                      'Importar'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {quickViewClient && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closeQuickView} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[430px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {quickViewClient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{quickViewClient.name}</h3>
                    <div className="mt-1">{getStatusBadge((quickViewDetails?.status || quickViewClient.status) as string)}</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Cliente desde {new Date((quickViewDetails?.createdAt || quickViewClient.createdAt || new Date().toISOString())).toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={closeQuickView} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex gap-1 border-b border-slate-200">
                <button
                  onClick={() => setQuickViewTab('resumen')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    quickViewTab === 'resumen' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resumen
                </button>
                <button
                  onClick={() => setQuickViewTab('actividad')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    quickViewTab === 'actividad' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Actividad
                </button>
                <button
                  onClick={() => setQuickViewTab('documentos')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    quickViewTab === 'documentos' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Documentos
                </button>
                <button
                  onClick={() => setQuickViewTab('historial')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    quickViewTab === 'historial' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {isQuickViewLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : quickViewTab === 'resumen' ? (
                <>
                  <section>
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Información principal</h4>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Cliente</dt>
                        <dd className="text-slate-900 font-medium text-right">{quickViewDetails?.name || quickViewClient.name}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Ubicación</dt>
                        <dd className="text-slate-900 text-right">
                          {quickViewDetails?.address || quickViewClient.address || 'No registrada'}
                          {(quickViewDetails?.city || quickViewClient.city) && (
                            <span className="block text-xs text-slate-500 mt-0.5">
                              {[quickViewDetails?.city || quickViewClient.city, quickViewDetails?.country || quickViewClient.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </dd>
                      </div>
                      {(quickViewDetails?.ruc || quickViewClient.ruc) && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">RUC</dt>
                          <dd className="text-slate-900 text-right">{quickViewDetails?.ruc || quickViewClient.ruc}</dd>
                        </div>
                      )}
                      {(quickViewDetails?.cedula || quickViewClient.cedula) && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">Cédula</dt>
                          <dd className="text-slate-900 text-right">{quickViewDetails?.cedula || quickViewClient.cedula}</dd>
                        </div>
                      )}
                      {!quickViewDetails?.ruc && !quickViewClient.ruc && !quickViewDetails?.cedula && !quickViewClient.cedula && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">RUC / Cédula</dt>
                          <dd className="text-slate-900 text-right">N/A</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">WhatsApp</dt>
                        <dd className="text-green-600 text-right flex items-center justify-end gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          {quickViewDetails?.phone || quickViewClient.phone || 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Estado</dt>
                        <dd className="text-right">{getStatusBadge((quickViewDetails?.status || quickViewClient.status) as string)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-600">Notas</dt>
                        <dd className="text-slate-900 text-right">-</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Acciones rápidas</h4>
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          closeQuickView()
                          startEditingRow(quickViewClient)
                        }}
                        className="w-full flex items-center gap-3 text-left text-sm text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div>
                          <div className="font-medium">Editar cliente</div>
                          <div className="text-xs text-slate-500">Modificar información</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => {
                          closeQuickView()
                          router.push(`/clientes/${quickViewClient.id}`)
                        }}
                        className="w-full flex items-center gap-3 text-left text-sm text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-medium">Cambiar estado</div>
                          <div className="text-xs text-slate-500">Actualizar estado</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => {
                          closeQuickView()
                          router.push(`/clientes/${quickViewClient.id}`)
                        }}
                        className="w-full flex items-center gap-3 text-left text-sm text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-medium">Ver historial</div>
                          <div className="text-xs text-slate-500">Ver actividad y cambios</div>
                        </div>
                      </button>
                    </div>
                  </section>

                  <button
                    className="w-full mt-6 py-3 px-4 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 font-medium"
                    onClick={() => {
                      closeQuickView()
                      handleDeleteClient(quickViewClient.id)
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar cliente
                  </button>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">Contenido de {quickViewTab} próximamente</p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <ClientesPageContent />
    </Suspense>
  )
}
