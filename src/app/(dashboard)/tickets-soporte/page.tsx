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
import * as XLSX from 'xlsx'

interface Ticket {
  id: string
  title: string
  description: string | null
  status: 'PROCESO1' | 'PROCESO2' | 'PROCESO3' | 'PROCESO4'
  priority: string
  amount: number | null
  dueDate: string | null
  company: { name: string }
  client: { id: string; name: string } | null
  assignedTo: string | null
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
  amount: string
  dueDate: string
}

const DEFAULT_COLUMNS = [
  { id: 'PROCESO1', label: 'Proceso 1', color: 'border-red-400' },
  { id: 'PROCESO2', label: 'Proceso 2', color: 'border-blue-400' },
  { id: 'PROCESO3', label: 'Proceso 3', color: 'border-yellow-400' },
  { id: 'PROCESO4', label: 'Proceso 4', color: 'border-green-400' },
]

export default function TicketsSoportePage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('ticketColumnLabels') || '{}') } catch { return {} }
  })
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnValue, setEditingColumnValue] = useState('')

  const getColumnLabel = (col: { id: string; label: string }) =>
    columnLabels[col.id] || col.label

  const startEditColumn = (colId: string, currentLabel: string) => {
    setEditingColumnId(colId)
    setEditingColumnValue(currentLabel)
  }

  const saveColumnLabel = (colId: string) => {
    const updated = { ...columnLabels, [colId]: editingColumnValue.trim() || colId }
    setColumnLabels(updated)
    localStorage.setItem('ticketColumnLabels', JSON.stringify(updated))
    setEditingColumnId(null)
  }

  const COLUMNS = DEFAULT_COLUMNS
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    clientId: '',
    status: 'PROCESO1',
    priority: 'MEDIUM',
    assignedTo: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
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
  }, [selectedCompany, selectedPeriod])

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
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
    })
    setEditingTicketId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (ticket: Ticket) => {
    setEditingTicketId(ticket.id)
    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      clientId: ticket.client?.id || '',
      status: ticket.status,
      priority: (ticket.priority as TicketFormData['priority']) || 'MEDIUM',
      assignedTo: ticket.assignedTo || '',
      amount: ticket.amount !== null ? String(ticket.amount) : '',
      dueDate: ticket.dueDate ? ticket.dueDate.split('T')[0] : '',
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
          amount: formData.amount ? parseFloat(formData.amount) : null,
          dueDate: formData.dueDate || null,
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
      Monto: ticket.amount ?? '',
      FechaVencimiento: ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString('es-ES') : '',
      Asignado: ticket.assignedTo || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets')
    XLSX.writeFile(workbook, `tickets_soporte_${Date.now()}.xlsx`)
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

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedTicket) return
    setDragOverStatus(null)

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
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR
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

      <div className="flex items-center gap-4">
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

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTickets = getTicketsByStatus(column.id)
          const totalAmount = getTotalAmount(column.id)
          const isDragTarget = draggedTicket && !columnTickets.find(t => t.id === draggedTicket)
          const isDropTarget = dragOverStatus === column.id

          return (
            <div
              key={column.id}
              className={`bg-white rounded-lg shadow transition-all duration-200 ${
                isDropTarget 
                  ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' 
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} rounded-t-lg`}>
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
                      className="font-semibold text-gray-900 bg-white border border-blue-400 rounded px-2 py-0.5 text-sm w-full mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-gray-900">{getColumnLabel(column)}</h3>
                      <button
                        type="button"
                        onClick={() => startEditColumn(column.id, getColumnLabel(column))}
                        className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Renombrar columna"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <span className="text-sm text-gray-500 flex-shrink-0">{columnTickets.length}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</div>
              </div>

              <div className={`p-4 space-y-3 min-h-[400px] transition-all duration-200 ${
                isDropTarget ? 'bg-blue-50' : ''
              }`}>
                {columnTickets.length === 0 && !isDragTarget ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm">Arrastra tickets aquí</p>
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
                        onDragEnd={() => { setDraggedTicket(null); setDragOverStatus(null) }}
                        className={`group bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 select-none animate-in fade-in slide-in-from-bottom-2 border-l-4 ${column.color} ${
                          isDragging 
                            ? 'opacity-50 scale-95 rotate-1 cursor-grabbing border border-gray-200' 
                            : selectedTicketId === ticket.id 
                            ? 'border border-primary ring-1 ring-primary/40 scale-100' 
                            : 'border border-gray-200 scale-100'
                        }`}
                        style={{ 
                          animationDelay: `${index * 50}ms`,
                          animationDuration: '300ms',
                          animationFillMode: 'both'
                        }}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ticket.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
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
                          className="text-gray-500 hover:text-gray-900"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">{ticket.title}</h4>
                      <div className="text-sm text-gray-600 mb-3">
                        {ticket.client?.name || 'Sin cliente'}
                      </div>
                      {ticket.dueDate && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Cierre: {new Date(ticket.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {ticket.amount && (
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>${ticket.amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-xs">
                            {ticket.assignedTo?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    </div>
                    )
                  })
                )}

                {/* Drop zone hint */}
                {isDragTarget && (
                  <div className={`border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isDropTarget 
                      ? 'border-blue-500 bg-blue-100/50 h-32 scale-105' 
                      : 'border-blue-300 bg-blue-50/30 h-24'
                  } ${columnTickets.length === 0 ? '' : 'mt-3'}`}>
                    <div className="text-center">
                      <svg className={`w-8 h-8 mx-auto mb-1 transition-all ${
                        isDropTarget ? 'text-blue-600 scale-110' : 'text-blue-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className={`text-sm font-medium ${
                        isDropTarget ? 'text-blue-700' : 'text-blue-500'
                      }`}>
                        {isDropTarget ? 'Soltar ahora' : 'Soltar aquí'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
              options={COLUMNS.map((column) => ({ value: column.id, label: column.label }))}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Ticket['status'] })}
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
          <UserAutocomplete
            label="Asignado a"
            value={formData.assignedTo}
            onChange={(value) => setFormData({ ...formData, assignedTo: value })}
            companyId={selectedCompany !== 'all' ? selectedCompany : companies[0]?.id || ''}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => {
              setIsModalOpen(false)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingTicketId ? 'Guardar Cambios' : 'Crear Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
