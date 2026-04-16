'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { UserAutocomplete } from '@/components/ui-kit/UserAutocomplete'
import { MultiUserSelector } from '@/components/ui-kit/MultiUserSelector'
import { exportWithCompanyHeader } from '@/lib/export-utils'

interface Ticket {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  amount: number | null
  currency: string
  startDate: string | null
  dueDate: string | null
  attachments: string | null
  company: { name: string }
  client: { id: string; name: string } | null
  assignedTo: string | null
  assignedUsers: string | null
}

interface Company {
  id: string
  name: string
  logo: string | null
}

interface ClientOption {
  id: string
  name: string
}

interface TicketFormData {
  title: string
  description: string
  clientId: string
  status: Ticket['status']
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignedTo: string
  assignedUsers: string[]
  amount: string
  currency: 'USD' | 'NIO'
  startDate: string
  dueDate: string
  attachments: File[]
  evidence: File[]
  existingAttachments: string[]
  existingEvidence: string[]
}

const DEFAULT_COLUMNS = [
  { id: 'PROCESO1', label: 'Proceso 1', color: 'border-red-400' },
  { id: 'PROCESO2', label: 'Proceso 2', color: 'border-blue-400' },
  { id: 'PROCESO3', label: 'Proceso 3', color: 'border-yellow-400' },
  { id: 'PROCESO4', label: 'Proceso 4', color: 'border-green-400' },
]

const STAGE_COLORS = [
  'border-red-400', 'border-blue-400', 'border-yellow-400', 
  'border-green-400', 'border-purple-400', 'border-pink-400', 
  'border-orange-400', 'border-teal-400', 'border-indigo-400'
]

export default function TicketsSoportePage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnValue, setEditingColumnValue] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)

  const fetchStages = useCallback(async () => {
    if (selectedCompany === 'all') {
      setColumns(DEFAULT_COLUMNS)
      return
    }
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/companies/${selectedCompany}/ticket-stages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setColumns(data.data)
      } else {
        setColumns(DEFAULT_COLUMNS)
      }
    } catch {
      setColumns(DEFAULT_COLUMNS)
    }
  }, [selectedCompany])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  const saveColumnLabel = async (colId: string) => {
    const updated = columns.map(c => 
      c.id === colId ? { ...c, label: editingColumnValue.trim() || c.label } : c
    )
    setColumns(updated)
    setEditingColumnId(null)
    
    // Persist to DB if company is selected
    if (selectedCompany !== 'all') {
      const token = localStorage.getItem('accessToken')
      await fetch(`/api/companies/${selectedCompany}/ticket-stages`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updated })
      })
    }
  }

  const addColumn = async () => {
    const newId = `PROCESO${columns.length + 1}`
    const newStage = { 
      id: newId, 
      label: `Proceso ${columns.length + 1}`, 
      color: STAGE_COLORS[columns.length % STAGE_COLORS.length] 
    }
    const updated = [...columns, newStage]
    setColumns(updated)
    
    if (selectedCompany !== 'all') {
      const token = localStorage.getItem('accessToken')
      await fetch(`/api/companies/${selectedCompany}/ticket-stages`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updated })
      })
    }
  }

  const removeColumn = async (colId: string) => {
    if (columns.length <= 1) return
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta etapa? Los tickets en esta etapa podrían quedar huérfanos.')
    if (!confirmed) return

    const updated = columns.filter(c => c.id !== colId)
    setColumns(updated)
    
    if (selectedCompany !== 'all') {
      const token = localStorage.getItem('accessToken')
      await fetch(`/api/companies/${selectedCompany}/ticket-stages`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updated })
      })
    }
  }

  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    clientId: '',
    status: 'PROCESO1',
    priority: 'MEDIUM',
    assignedTo: '',
    assignedUsers: [],
    amount: '',
    currency: 'USD',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    attachments: [],
    evidence: [],
    existingAttachments: [],
    existingEvidence: [],
  })

  const getPeriodRange = (period: string) => {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    const startDate = new Date(endDate)
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3)
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1)
    }
    startDate.setHours(0, 0, 0, 0)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

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
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      const { startDate, endDate } = getPeriodRange(selectedPeriod)
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      params.append('startDate', startDate)
      params.append('endDate', endDate)

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setTickets(data.data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedPeriod, searchTerm])

  const fetchClients = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)

      const response = await fetch(`/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setClients((data.data || []).map((client: any) => ({ id: client.id, name: client.name })))
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [selectedCompany])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      clientId: '',
      status: 'PROCESO1',
      priority: 'MEDIUM',
      assignedTo: '',
      assignedUsers: [],
      amount: '',
      currency: 'USD',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      attachments: [],
      evidence: [],
      existingAttachments: [],
      existingEvidence: [],
    })
    setEditingTicketId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (ticket: Ticket) => {
    setEditingTicketId(ticket.id)
    let parsedUsers: string[] = []
    try {
      if (ticket.assignedUsers) parsedUsers = JSON.parse(ticket.assignedUsers)
    } catch { /* ignore */ }
    let parsedAttachments: string[] = []
    try {
      if (ticket.attachments) parsedAttachments = JSON.parse(ticket.attachments)
    } catch { /* ignore */ }

    let parsedEvidence: string[] = []
    try {
      if (ticket.evidence) parsedEvidence = JSON.parse(ticket.evidence)
    } catch { /* ignore */ }

    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      clientId: ticket.client?.id || '',
      status: ticket.status,
      priority: (ticket.priority as TicketFormData['priority']) || 'MEDIUM',
      assignedTo: ticket.assignedTo || '',
      assignedUsers: parsedUsers,
      amount: ticket.amount !== null ? String(ticket.amount) : '',
      currency: (ticket.currency as 'USD' | 'NIO') || 'USD',
      startDate: ticket.startDate ? ticket.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: ticket.dueDate ? ticket.dueDate.split('T')[0] : '',
      attachments: [],
      evidence: [],
      existingAttachments: parsedAttachments,
      existingEvidence: parsedEvidence,
    })
    setIsModalOpen(true)
  }

  const openSelectedTicketForEdit = () => {
    if (!selectedTicketId) {
      alert('Selecciona un ticket para editar')
      return
    }

    const targetTicket = tickets.find((ticket) => ticket.id === selectedTicketId)
    if (!targetTicket) {
      alert('Ticket no encontrado')
      return
    }

    openEditModal(targetTicket)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const fallbackCompanyId = activeCompany?.id || companies[0]?.id
    const targetCompanyId = selectedCompany !== 'all' ? selectedCompany : fallbackCompanyId

    if (!editingTicketId && !targetCompanyId) {
      alert('Selecciona una empresa para crear el ticket')
      return
    }

    try {
      setIsSaving(true)

      // Upload attachments
      let attachmentUrls: string[] = [...formData.existingAttachments]
      if (formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadFormData,
          })
          const uploadData = await uploadRes.json()
          if (uploadData.success && uploadData.data?.url) attachmentUrls.push(uploadData.data.url)
        }
      }

      // Upload evidence
      let evidenceUrls: string[] = [...formData.existingEvidence]
      if (formData.evidence.length > 0) {
        for (const file of formData.evidence) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadFormData,
          })
          const uploadData = await uploadRes.json()
          if (uploadData.success && uploadData.data?.url) evidenceUrls.push(uploadData.data.url)
        }
      }

      const response = await fetch(editingTicketId ? `/api/tickets/${editingTicketId}` : '/api/tickets', {
        method: editingTicketId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          clientId: formData.clientId || null,
          status: formData.status,
          priority: formData.priority,
          assignedTo: formData.assignedTo || null,
          assignedUsers: formData.assignedUsers.length > 0 ? formData.assignedUsers : null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          currency: formData.currency,
          startDate: formData.startDate || null,
          dueDate: formData.dueDate || null,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
          evidence: evidenceUrls.length > 0 ? evidenceUrls : null,
          ...(editingTicketId ? {} : { companyId: targetCompanyId }),
        }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo guardar el ticket')
        return
      }

      setIsModalOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving ticket:', error)
      alert('Error al guardar ticket')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = () => {
    if (!tickets.length) {
      alert('No hay tickets para exportar')
      return
    }

    const rows = tickets.map((ticket) => ({
      Titulo: ticket.title,
      Empresa: ticket.company?.name || '',
      Cliente: ticket.client?.name || '',
      Estado: ticket.status,
      Prioridad: ticket.priority,
      Moneda: ticket.currency === 'NIO' ? 'C$' : '$',
      Monto: ticket.amount ?? '',
      FechaVencimiento: ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString('es-ES') : '',
      Asignado: ticket.assignedTo || '',
    }))

    exportWithCompanyHeader(
      rows,
      `tickets_soporte_${Date.now()}.xlsx`,
      'Reporte de Tickets de Soporte',
      companies,
      selectedCompany
    )
  }

  const getTicketsByStatus = (status: string) => {
    return tickets.filter(t => t.status === status)
  }

  const getTotalAmount = (status: string) => {
    return getTicketsByStatus(status).reduce((sum, t) => sum + (t.amount || 0), 0)
  }

  const handleDragStart = (ticketId: string) => {
    setDraggedTicket(ticketId)
  }

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    setDragOverStatus(statusId)
  }

  const handleDragOverCard = (e: React.DragEvent, cardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCardId(cardId)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
    setDragOverCardId(null)
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedTicket) return
    setDragOverStatus(null)
    setDragOverCardId(null)

    // Reorder within same column
    const draggedObj = tickets.find(t => t.id === draggedTicket)
    if (draggedObj && draggedObj.status === newStatus && dragOverCardId && dragOverCardId !== draggedTicket) {
      setTickets(prev => {
        const colItems = prev.filter(t => t.status === newStatus)
        const rest = prev.filter(t => t.status !== newStatus)
        const fromIdx = colItems.findIndex(t => t.id === draggedTicket)
        const toIdx = colItems.findIndex(t => t.id === dragOverCardId)
        if (fromIdx === -1 || toIdx === -1) return prev
        const reordered = [...colItems]
        const [moved] = reordered.splice(fromIdx, 1)
        reordered.splice(toIdx, 0, moved)
        return [...rest, ...reordered]
      })
      setDraggedTicket(null)
      return
    }
    if (draggedObj?.status === newStatus) {
      setDraggedTicket(null)
      return
    }

    // Optimistic update
    const previousTickets = [...tickets]
    setTickets(tickets.map(t =>
      t.id === draggedTicket ? { ...t, status: newStatus as Ticket['status'] } : t
    ))

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/tickets/${draggedTicket}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (!data.success) {
        setTickets(previousTickets)
        alert('Error al mover el ticket')
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
      setTickets(previousTickets)
      alert('Error al mover el ticket')
    } finally {
      setDraggedTicket(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tickets & Soporte</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión visual de oportunidades activas y priorización de cierre.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} title="Reporte detallado de todas las incidencias">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            REPORTE INCIDENCIA
          </Button>
          <Button variant="outline" onClick={openSelectedTicketForEdit}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDITAR
          </Button>
          <Button onClick={openCreateModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AÑADIR
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Buscar por título, cliente, descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map((company) => ({ value: company.id, label: company.name })),
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-56"
        />
        <Select
          options={[
            { value: 'month', label: 'ÚLTIMO MES' },
            { value: 'quarter', label: 'ÚLTIMO TRIMESTRE' },
            { value: 'year', label: 'ÚLTIMO AÑO' },
          ]}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-56"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-200">
        {columns.map((column) => {
          const columnTickets = getTicketsByStatus(column.id)
          const totalAmount = getTotalAmount(column.id)
          const isDragTarget = draggedTicket && !columnTickets.find(t => t.id === draggedTicket)
          const isDropTarget = dragOverStatus === column.id

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-300 ${
                isDropTarget 
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.01] bg-slate-50' 
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} rounded-t-xl bg-white`}>
                <div className="flex items-center justify-between mb-2">
                  {editingColumnId === column.id ? (
                    <input
                      autoFocus
                      value={editingColumnValue}
                      onChange={(e) => setEditingColumnValue(e.target.value)}
                      onBlur={() => saveColumnLabel(column.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveColumnLabel(column.id)
                        if (e.key === 'Escape') setEditingColumnId(null)
                      }}
                      className="font-semibold text-gray-900 bg-white border border-primary rounded px-2 py-0.5 text-sm w-full mr-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <h3 className="font-semibold text-gray-900 truncate max-w-[180px]">{column.label}</h3>
                      <button
                        type="button"
                        onClick={() => { setEditingColumnId(column.id); setEditingColumnValue(column.label) }}
                        className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-all"
                        title="Renombrar columna"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeColumn(column.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar columna"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <span className="text-sm font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{columnTickets.length}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">${totalAmount.toLocaleString()}</div>
              </div>

              <div className={`p-3 space-y-4 min-h-[400px] max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 transition-colors duration-300 ${
                isDropTarget ? 'bg-primary/5' : ''
              }`}>
                {columnTickets.length === 0 && !isDragTarget ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-medium uppercase tracking-wider">Sin tickets</p>
                  </div>
                ) : (
                  columnTickets.map((ticket, index) => {
                    const isDragging = draggedTicket === ticket.id
                    
                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onClick={() => router.push(`/tickets-soporte/${ticket.id}`)}
                        onDragStart={() => handleDragStart(ticket.id)}
                        onDragOver={(e) => handleDragOverCard(e, ticket.id)}
                        onDragEnd={() => { setDraggedTicket(null); setDragOverStatus(null); setDragOverCardId(null) }}
                        className={`group bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-lg transition-all duration-300 select-none border-l-4 ${column.color} ${
                          isDragging 
                            ? 'opacity-40 scale-95 rotate-1 grayscale shadow-inner border-primary ring-2 ring-primary/20'
                            : dragOverCardId === ticket.id && draggedTicket !== ticket.id
                            ? 'ring-2 ring-primary border border-primary/20 scale-[1.02] -translate-y-1'
                            : 'border border-gray-100'
                        }`}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {ticket.priority && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                              ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {ticket.priority === 'URGENT' ? 'Urgente' : ticket.priority === 'HIGH' ? 'Alta' : ticket.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(ticket)
                          }}
                          className="text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2 leading-tight">{ticket.title}</h4>
                      <p className="text-[11px] text-gray-500 mb-2 truncate font-medium">{ticket.client?.name || 'Venta General'}</p>
                      
                      <div className="flex items-center gap-4 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {ticket.startDate && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Inicio</span>
                            <span className="text-[10px] font-black text-slate-700">{new Date(ticket.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {ticket.dueDate && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Entrega</span>
                            <span className="text-[10px] font-black text-primary">{new Date(ticket.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Monto</span>
                          <span className="text-sm font-bold text-gray-900">{ticket.currency === 'NIO' ? 'C$' : '$'}{ticket.amount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex items-center -space-x-2">
                           {/* Mostrar avatares de usuarios asignados */}
                           {(() => {
                             try {
                               const userIds = ticket.assignedUsers ? JSON.parse(ticket.assignedUsers) : []
                               if (Array.isArray(userIds) && userIds.length > 0) {
                                 return userIds.slice(0, 3).map((id: string, idx: number) => (
                                   <div 
                                     key={id} 
                                     className="w-7 h-7 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                                     title={`ID: ${id}`}
                                   >
                                     U{idx + 1}
                                   </div>
                                 ))
                               }
                             } catch { /* ignore */ }
                             
                             if (ticket.assignedTo) {
                               return (
                                 <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/5" title={ticket.assignedTo}>
                                   {ticket.assignedTo.charAt(0).toUpperCase()}
                                 </div>
                               )
                             }
                             return null
                           })()}
                        </div>
                      </div>
                    </div>
                    )
                  })
                )}

                {isDragTarget && (
                  <div className={`border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isDropTarget 
                      ? 'border-primary bg-primary/10 h-32 scale-100' 
                      : 'border-primary/30 bg-primary/5 h-24 scale-95'
                  } ${columnTickets.length === 0 ? '' : 'mt-3'}`}>
                    <div className="text-center">
                      <svg className={`w-8 h-8 mx-auto mb-1 transition-all ${isDropTarget ? 'text-primary animate-bounce' : 'text-primary/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDropTarget ? 'text-primary' : 'text-primary/50'}`}>
                        {isDropTarget ? 'Liberar' : 'Mover'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        
        {/* Add Column Button */}
        <div className="flex-shrink-0 w-12 flex items-start pt-14">
           <button 
             onClick={addColumn}
             className="w-10 h-10 rounded-full bg-white border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center shadow-sm"
             title="Añadir etapa"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
             </svg>
           </button>
        </div>
      </div>
    </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingTicketId ? 'Editar Ticket' : 'Nuevo Ticket'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
          />
          <Select
            label="Cliente"
            options={[
              { value: '', label: 'Sin cliente' },
              ...clients.map((client) => ({ value: client.id, label: client.name })),
            ]}
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            fullWidth
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              options={columns.map((column) => ({ value: column.id, label: column.label }))}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              fullWidth
            />
            <Select
              label="Prioridad"
              options={[
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' },
              ]}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketFormData['priority'] })}
              fullWidth
            />
          </div>
          <MultiUserSelector
            label="Usuarios Asignados"
            companyId={selectedCompany !== 'all' ? selectedCompany : (companies[0]?.id || '')}
            selectedUserIds={formData.assignedUsers}
            onChange={(ids) => setFormData({ ...formData, assignedUsers: ids })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
            />
            <Select
              label="Moneda"
              options={[
                { value: 'USD', label: '$ USD' },
                { value: 'NIO', label: 'C$ NIO' },
              ]}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'NIO' })}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              fullWidth
            />
            <Input
              label="Fecha límite"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              fullWidth
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                📁 Documentación y Adjuntos
              </label>
              
              {formData.existingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.existingAttachments.map((url, i) => (
                    <div key={i} className="group relative">
                      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/5 transition-all">
                        DOC {i + 1}
                      </a>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, existingAttachments: formData.existingAttachments.filter((_, idx) => idx !== i) })}
                        className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setFormData({ ...formData, attachments: [...formData.attachments, ...files] })
                }}
                className="block w-full text-[11px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              {formData.attachments.length > 0 && (
                <div className="mt-2 text-[10px] text-primary font-bold">
                  +{formData.attachments.length} archivo(s) nuevo(s) por subir
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                📸 Evidencia de Proceso (Fotos/Videos)
              </label>

              {formData.existingEvidence.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.existingEvidence.map((url, i) => (
                    <div key={i} className="group relative">
                      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/5 transition-all">
                        EVID {i + 1}
                      </a>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, existingEvidence: formData.existingEvidence.filter((_, idx) => idx !== i) })}
                        className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setFormData({ ...formData, evidence: [...formData.evidence, ...files] })
                }}
                className="block w-full text-[11px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              {formData.evidence.length > 0 && (
                <div className="mt-2 text-[10px] text-primary font-bold">
                  +{formData.evidence.length} evidencia(s) nueva(s) por subir
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => {
              setIsModalOpen(false)
              resetForm()
            }}>
              CANCELAR
            </Button>
            <Button type="submit" disabled={isSaving} className="font-bold">
              {isSaving ? 'GUARDANDO...' : editingTicketId ? 'ACTUALIZAR TICKET' : 'CREAR TICKET'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
