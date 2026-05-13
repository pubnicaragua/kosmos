'use client'

import { useState, useEffect, useCallback, useRef, useMemo, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { ClientAutocomplete } from '@/components/ui-kit/ClientAutocomplete'
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
  evidence?: string | null
  company: { name: string }
  client: { id: string; name: string } | null
  assignedTo: string | null
  assignedUsers: string | null
  createdBy?: string | null
  hasCharge?: boolean
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
  type: string
  status: Ticket['status']
  priority: 'BAJA' | 'MEDIA' | 'ALTA'
  assignedTo: string
  assignedUsers: string[]
  branch: string
  amount: string
  currency: 'USD' | 'NIO'
  startDate: string
  startTime: string
  dueDate: string
  dueTime: string
  attachments: File[]
  evidence: File[]
  existingAttachments: string[]
  existingEvidence: string[]
  isInternal: boolean
  hasCharge: boolean
  // Información técnica
  equipmentType: string
  equipmentBrand: string
  equipmentModel: string
  serialNumber: string
  installationDate: string
  installedBy: string
}

const DEFAULT_COLUMNS = [
  { id: 'NUEVO', label: 'Nuevo', color: 'border-blue-400' },
  { id: 'ASIGNADO', label: 'Asignado', color: 'border-yellow-400' },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'border-orange-400' },
  { id: 'RESUELTO', label: 'Resuelto', color: 'border-green-400' },
]

const STAGE_COLORS = [
  'border-red-400', 'border-blue-400', 'border-yellow-400', 
  'border-green-400', 'border-purple-400', 'border-pink-400', 
  'border-orange-400', 'border-teal-400', 'border-indigo-400'
]

const IMAGE_PREVIEW_REGEX = /\.(png|jpe?g|gif|webp)(\?|#|$)/i

const parseMediaList = (value?: string | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const splitDateTime = (value?: string | null) => {
  if (!value) return { date: '', time: '' }
  const [datePart, timePart] = value.split('T')
  return {
    date: datePart || '',
    time: timePart ? timePart.slice(0, 5) : '',
  }
}

const parseAssignedUserIds = (value?: string | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const isAdminRole = (role?: string | null) => role === 'SUPER_ADMIN' || role === 'ADMIN'

const getTicketStageFlags = (status: string) => {
  const normalized = status?.toUpperCase()?.replace('_', ' ') || ''
  const isFinal = normalized === 'RESUELTO' || normalized === 'CERRADO'
  const isInProgress = normalized === 'EN PROCESO'
  const isPending = !isFinal && !isInProgress
  return { isPending, isInProgress, isFinal }
}

const getTicketMediaUrls = (ticket: Ticket) => {
  return [...parseMediaList(ticket.attachments), ...parseMediaList(ticket.evidence)]
}

const getTicketPreviewImage = (ticket: Ticket) => {
  return getTicketMediaUrls(ticket).find((url) => IMAGE_PREVIEW_REGEX.test(url))
}

export default function TicketsSoportePage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchPreviewTicket, setSearchPreviewTicket] = useState<Ticket | null>(null)
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnValue, setEditingColumnValue] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddClientId, setQuickAddClientId] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const quickAddInputRef = useRef<HTMLInputElement>(null)
  const [companyUsersById, setCompanyUsersById] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

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

  const fetchCompanyUsers = useCallback(async () => {
    if (selectedCompany === 'all') {
      setCompanyUsersById({})
      return
    }
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/companies/${selectedCompany}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        const map: Record<string, string> = {}
        ;(data.data || []).forEach((member: any) => {
          if (member?.userId && member?.user?.name) {
            map[member.userId] = member.user.name
          }
        })
        setCompanyUsersById(map)
      }
    } catch (error) {
      console.error('Error fetching company users:', error)
    }
  }, [selectedCompany])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  useEffect(() => {
    const loadSession = () => {
      try {
        const storedUser = localStorage.getItem('user')
        const storedCompany = localStorage.getItem('activeCompany')
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setCurrentUserId(parsedUser?.id || null)
          setCurrentUserName(parsedUser?.name || null)
        }
        if (storedCompany) {
          const parsedCompany = JSON.parse(storedCompany)
          setCurrentUserRole(parsedCompany?.role || null)
        }
      } catch {
        setCurrentUserId(null)
        setCurrentUserName(null)
        setCurrentUserRole(null)
      }
    }

    loadSession()
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === 'user' || event.key === 'activeCompany') {
        loadSession()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

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
    type: '',
    status: 'NUEVO',
    priority: 'MEDIA',
    assignedTo: '',
    assignedUsers: [],
    branch: '',
    amount: '',
    currency: 'USD',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '',
    dueDate: '',
    dueTime: '',
    attachments: [],
    evidence: [],
    existingAttachments: [],
    existingEvidence: [],
    isInternal: false,
    hasCharge: false,
    equipmentType: '',
    equipmentBrand: '',
    equipmentModel: '',
    serialNumber: '',
    installationDate: '',
    installedBy: '',
  })

  const [uploadedEvidenceUrls, setUploadedEvidenceUrls] = useState<string[]>([])

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedSearchTerm) return []
    return tickets
      .filter(t =>
        t.title.toLowerCase().includes(normalizedSearchTerm) ||
        t.description?.toLowerCase().includes(normalizedSearchTerm) ||
        t.client?.name.toLowerCase().includes(normalizedSearchTerm)
      )
      .slice(0, 8)
  }, [normalizedSearchTerm, tickets])

  useEffect(() => {
    if (!normalizedSearchTerm) {
      if (searchPreviewTicket) setSearchPreviewTicket(null)
      return
    }
    if (searchResults.length === 0) {
      if (searchPreviewTicket) setSearchPreviewTicket(null)
      return
    }
    if (!searchPreviewTicket || !searchResults.some(t => t.id === searchPreviewTicket.id)) {
      setSearchPreviewTicket(searchResults[0])
    }
  }, [normalizedSearchTerm, searchResults, searchPreviewTicket])

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

      const [ticketsRes, kpisRes] = await Promise.all([
        fetch(`/api/tickets?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/tickets/kpis?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ])

      const ticketsData = await ticketsRes.json()
      const kpisData = await kpisRes.json()
      
      if (ticketsData.success) {
        setTickets(ticketsData.data)
      }
      if (kpisData.success) {
        setKpis(kpisData.data)
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

  useEffect(() => {
    fetchCompanyUsers()
  }, [fetchCompanyUsers])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      clientId: '',
      type: '',
      status: 'NUEVO',
      priority: 'MEDIA',
      assignedTo: '',
      assignedUsers: [],
      branch: '',
      amount: '',
      currency: 'USD',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '',
      dueDate: '',
      dueTime: '',
      attachments: [],
      evidence: [],
      existingAttachments: [],
      existingEvidence: [],
      isInternal: false,
      hasCharge: false,
      equipmentType: '',
      equipmentBrand: '',
      equipmentModel: '',
      serialNumber: '',
      installationDate: '',
      installedBy: '',
    })
    setEditingTicketId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openQuickAdd = (columnId: string) => {
    setQuickAddColumnId(columnId)
    setQuickAddTitle('')
    setQuickAddClientId('')
    setTimeout(() => quickAddInputRef.current?.focus(), 0)
  }

  const handleQuickAddSubmit = async (status: string) => {
    if (!quickAddTitle.trim()) return
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const fallbackCompanyId = activeCompany?.id || companies[0]?.id
    const targetCompanyId = selectedCompany !== 'all' ? selectedCompany : fallbackCompanyId
    if (!targetCompanyId) {
      alert('Selecciona una empresa para crear el ticket')
      return
    }

    try {
      setQuickAddSaving(true)
      const payload = {
        companyId: targetCompanyId,
        title: quickAddTitle.trim(),
        clientId: quickAddClientId || null,
        type: '',
        status,
        priority: 'MEDIA',
        isInternal: false,
        hasCharge: false,
      }
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        setQuickAddTitle('')
        setQuickAddClientId('')
        setQuickAddColumnId(null)
        fetchData()
      } else {
        alert(data.error || 'Error al crear ticket')
      }
    } catch (error) {
      console.error('Error quick add ticket:', error)
      alert('Error al crear ticket')
    } finally {
      setQuickAddSaving(false)
    }
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

    const startDateParts = splitDateTime(ticket.startDate)
    const dueDateParts = splitDateTime(ticket.dueDate)

    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      clientId: ticket.client?.id || '',
      type: (ticket as any).type || '',
      status: ticket.status,
      priority: (ticket.priority as TicketFormData['priority']) || 'MEDIA',
      assignedTo: ticket.assignedTo || '',
      assignedUsers: parsedUsers,
      branch: (ticket as any).branch || '',
      amount: ticket.amount !== null ? String(ticket.amount) : '',
      currency: (ticket.currency as 'USD' | 'NIO') || 'USD',
      startDate: startDateParts.date || new Date().toISOString().split('T')[0],
      startTime: startDateParts.time,
      dueDate: dueDateParts.date,
      dueTime: dueDateParts.time,
      attachments: [],
      evidence: [],
      existingAttachments: parsedAttachments,
      existingEvidence: parsedEvidence,
      isInternal: (ticket as any).isInternal || false,
      hasCharge: (ticket as any).hasCharge || false,
      equipmentType: (ticket as any).equipmentType || '',
      equipmentBrand: (ticket as any).equipmentBrand || '',
      equipmentModel: (ticket as any).equipmentModel || '',
      serialNumber: (ticket as any).serialNumber || '',
      installationDate: (ticket as any).installationDate ? (ticket as any).installationDate.split('T')[0] : '',
      installedBy: (ticket as any).installedBy || '',
    })
    setIsModalOpen(true)
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
          if (uploadData.success) {
            attachmentUrls.push(uploadData.data.url)
          }
        }
      }

      // Upload evidence files
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
          if (uploadData.success) {
            evidenceUrls.push(uploadData.data.url)
          }
        }
      }

      const buildDateTime = (dateValue: string, timeValue: string) => {
        if (!dateValue) return null
        if (!timeValue) return dateValue
        return `${dateValue}T${timeValue}`
      }

      const startDateValue = buildDateTime(formData.startDate, formData.startTime)
      const dueDateValue = buildDateTime(formData.dueDate, formData.dueTime)
      const assignedNamesFromIds = formData.assignedUsers
        .map((id) => companyUsersById[id])
        .filter(Boolean)
        .join(', ')

      const payload: any = {
        title: formData.title,
        description: formData.description || null,
        clientId: formData.isInternal ? null : (formData.clientId || null),
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        assignedTo: assignedNamesFromIds || formData.assignedTo || null,
        assignedUsers: formData.assignedUsers.length > 0 ? formData.assignedUsers : null,
        branch: formData.branch || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        currency: formData.currency,
        startDate: startDateValue,
        dueDate: dueDateValue,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        evidence: evidenceUrls.length > 0 ? evidenceUrls : null,
        isInternal: formData.isInternal,
        hasCharge: formData.hasCharge,
        equipmentType: formData.equipmentType || null,
        equipmentBrand: formData.equipmentBrand || null,
        equipmentModel: formData.equipmentModel || null,
        serialNumber: formData.serialNumber || null,
        installationDate: formData.installationDate || null,
        installedBy: formData.installedBy || null,
      }

      if (!editingTicketId) {
        payload.companyId = targetCompanyId
      }

      const response = await fetch(
        editingTicketId ? `/api/tickets/${editingTicketId}` : '/api/tickets',
        {
          method: editingTicketId ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()
      if (data.success) {
        setIsModalOpen(false)
        resetForm()
        fetchData()
      } else {
        alert(data.error || 'Error al guardar ticket')
      }
    } catch (error) {
      console.error('Error saving ticket:', error)
      alert('Error al guardar ticket')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('¿Eliminar este ticket?')) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId))
      } else {
        alert(data.error || 'Error al eliminar ticket')
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      alert('Error al eliminar ticket')
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

  const canDeleteTicket = useCallback(
    (ticket: Ticket) => {
      if (isAdminRole(currentUserRole)) return true
      if (!currentUserId) return false
      const assignedUserIds = parseAssignedUserIds(ticket.assignedUsers)
      if (assignedUserIds.includes(currentUserId)) return true
      if (currentUserName && ticket.assignedTo) {
        const assignedNames = ticket.assignedTo
          .split(',')
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
        if (assignedNames.includes(currentUserName.trim().toLowerCase())) return true
      }
      if (ticket.createdBy === currentUserId) {
        return ticket.status !== 'ASIGNADO' && ticket.status !== 'EN_PROCESO'
      }
      return false
    },
    [currentUserId, currentUserName, currentUserRole]
  )

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
          {/* Search with preview */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
            {normalizedSearchTerm && (
              <div className="absolute top-full left-0 mt-2 w-[680px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="flex max-h-[420px]">
                  <div className="w-80 border-r border-gray-100 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map(ticket => {
                        const previewImage = getTicketPreviewImage(ticket)
                        const mediaCount = getTicketMediaUrls(ticket).length
                        const isActive = searchPreviewTicket?.id === ticket.id

                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onMouseEnter={() => setSearchPreviewTicket(ticket)}
                            onClick={() => router.push(`/tickets-soporte/${ticket.id}`)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                              isActive ? 'bg-slate-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] text-gray-400 font-bold">
                                {previewImage ? (
                                  <img src={previewImage} alt={ticket.title} className="h-full w-full object-contain" />
                                ) : mediaCount > 0 ? (
                                  <span>ARCHIVO</span>
                                ) : (
                                  <span>SIN</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-semibold text-gray-900 line-clamp-2">{ticket.title}</div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                    ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                    ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {ticket.priority === 'URGENT' ? 'Urgente' : ticket.priority === 'HIGH' ? 'Alta' : ticket.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500">{ticket.client?.name || 'Sin cliente'}</div>
                                <div className="mt-1 flex items-center gap-2 text-[10px]">
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{ticket.status}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-4 text-sm text-gray-500">No se encontraron resultados</div>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    {searchPreviewTicket ? (
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Vista previa</div>
                        <div className="rounded-xl overflow-hidden bg-gray-100 h-44 flex items-center justify-center">
                          {(() => {
                            const previewImage = getTicketPreviewImage(searchPreviewTicket)
                            const mediaCount = getTicketMediaUrls(searchPreviewTicket).length
                            if (previewImage) {
                              return <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                            }
                            if (mediaCount > 0) {
                              return <span className="text-xs text-gray-500 font-semibold">Sin vista previa</span>
                            }
                            return <span className="text-xs text-gray-400 font-semibold">Sin adjuntos</span>
                          })()}
                        </div>
                        <div className="flex items-start gap-2">
                          <h4 className="font-bold text-base text-gray-900 flex-1">{searchPreviewTicket.title}</h4>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                            searchPreviewTicket.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            searchPreviewTicket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            searchPreviewTicket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {searchPreviewTicket.priority === 'URGENT' ? 'Urgente' : searchPreviewTicket.priority === 'HIGH' ? 'Alta' : searchPreviewTicket.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{searchPreviewTicket.description || 'Sin descripción'}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-500">Cliente:</span>
                            <span className="text-gray-900">{searchPreviewTicket.client?.name || 'Sin cliente'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-500">Estado:</span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{searchPreviewTicket.status}</span>
                          </div>
                          {searchPreviewTicket.startDate && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-500">Inicio:</span>
                              <span className="text-gray-900">{new Date(searchPreviewTicket.startDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {searchPreviewTicket.dueDate && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-500">Entrega:</span>
                              <span className="text-primary font-semibold">{new Date(searchPreviewTicket.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Selecciona un ticket</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleExport} title="Reporte detallado de todas las incidencias">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            REPORTE INCIDENCIA
          </Button>
          <Button onClick={openCreateModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            AÑADIR
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Tiempo Respuesta</p>
                <p className="text-3xl font-black text-blue-600">{kpis.avgResponseTime?.toFixed(1) || 0}h</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">Promedio de respuesta</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border border-green-100 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-green-400 uppercase tracking-widest">Tiempo Solución</p>
                <p className="text-3xl font-black text-green-600">{kpis.avgResolutionTime?.toFixed(1) || 0}h</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">Promedio de resolución</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-2xl border border-amber-100 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Reabiertos</p>
                <p className="text-3xl font-black text-amber-600">{kpis.reopenedTickets || 0}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">Tickets reabiertos</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border border-purple-100 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-purple-400 uppercase tracking-widest">Total Tickets</p>
                <p className="text-3xl font-black text-purple-600">{kpis.totalTickets || 0}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">Abiertos: {kpis.openTickets || 0} | Cerrados: {kpis.closedTickets || 0}</p>
          </div>
        </div>
      )}

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
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold text-gray-900">${totalAmount.toLocaleString()}</div>
                  <button
                    onClick={() => openQuickAdd(column.id)}
                    className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                    title="Crear ticket aquí"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`p-3 space-y-4 min-h-[400px] max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 transition-colors duration-300 ${
                isDropTarget ? 'bg-primary/5' : ''
              }`}>
                {quickAddColumnId === column.id && (
                  <div className="bg-white border border-primary/30 rounded-xl p-3 shadow-sm">
                    <input
                      ref={quickAddInputRef}
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAddSubmit(column.id)
                        if (e.key === 'Escape') setQuickAddColumnId(null)
                      }}
                      placeholder="Título del ticket..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="mt-2">
                      <ClientAutocomplete
                        companyId={selectedCompany}
                        value={quickAddClientId}
                        onChange={(value) => setQuickAddClientId(value)}
                        placeholder="Cliente (opcional)"
                        className="w-full"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Enter = guardar • Esc = cancelar</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickAddColumnId(null)}
                          className="text-xs font-bold text-gray-500 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddSubmit(column.id)}
                          className="text-xs font-bold text-primary hover:text-primary-dark"
                          disabled={quickAddSaving}
                        >
                          {quickAddSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                    const previewImage = getTicketPreviewImage(ticket)
                    const mediaCount = getTicketMediaUrls(ticket).length
                    const statusFlags = getTicketStageFlags(ticket.status)
                    
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
                        {canDeleteTicket(ticket) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(ticket.id)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar ticket"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2 leading-tight">{ticket.title}</h4>
                      <p className="text-[11px] text-gray-500 mb-2 truncate font-medium">{ticket.client?.name || 'Venta General'}</p>
                      
                      {(previewImage || mediaCount > 0) && (
                        <div className="mb-2 relative rounded-lg overflow-hidden bg-gray-100 h-20 flex items-center justify-center">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Attachment preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400 font-semibold">SIN VISTA PREVIA</span>
                          )}
                        </div>
                      )}
                      
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
                      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${statusFlags.isPending ? 'bg-gray-500' : 'bg-gray-200'}`} />
                            <span className={statusFlags.isPending ? 'text-gray-700' : 'text-gray-400'}>Pendiente</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${statusFlags.isInProgress ? 'bg-amber-500' : 'bg-gray-200'}`} />
                            <span className={statusFlags.isInProgress ? 'text-amber-700' : 'text-gray-400'}>En proceso</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${statusFlags.isFinal ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                            <span className={statusFlags.isFinal ? 'text-emerald-700' : 'text-gray-400'}>Finalizado</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {/* Mostrar usuarios asignados */}
                          {(() => {
                            let assignedNames: string[] = []
                            try {
                              const userIds = ticket.assignedUsers ? JSON.parse(ticket.assignedUsers) : []
                              if (Array.isArray(userIds) && userIds.length > 0) {
                                assignedNames = userIds
                                  .map((id: string) => companyUsersById[id])
                                  .filter(Boolean)
                              }
                            } catch { /* ignore */ }

                            if (assignedNames.length === 0 && ticket.assignedTo) {
                              assignedNames = ticket.assignedTo
                                .split(',')
                                .map((name) => name.trim())
                                .filter(Boolean)
                            }

                            if (assignedNames.length === 0) return null

                            return assignedNames.slice(0, 3).map((name) => (
                              <span
                                key={name}
                                title={name}
                                className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wide max-w-[120px] truncate"
                              >
                                {name}
                              </span>
                            ))
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Describe el problema, pasos y contexto..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <ClientAutocomplete
              companyId={selectedCompany}
              value={formData.clientId}
              onChange={(value) => setFormData({ ...formData, clientId: value })}
              placeholder="Buscar cliente..."
              disabled={formData.isInternal}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isInternal}
                onChange={(e) => {
                  setFormData({ ...formData, isInternal: e.target.checked, clientId: e.target.checked ? '' : formData.clientId })
                }}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              Ticket Interno (sin cliente)
            </label>
          </div>
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
                { value: 'BAJA', label: 'Baja (Consulta o Mejora)' },
                { value: 'MEDIA', label: 'Media (Fallo Parcial)' },
                { value: 'ALTA', label: 'Alta (Sistema No Funciona)' },
              ]}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketFormData['priority'] })}
              fullWidth
            />
          </div>
          <MultiUserSelector
            label="Usuarios asignados"
            companyId={selectedCompany !== 'all' ? selectedCompany : (companies[0]?.id || '')}
            selectedUserIds={formData.assignedUsers}
            onChange={(ids) => setFormData({ ...formData, assignedUsers: ids })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              fullWidth
            />
            <Input
              label="Hora de inicio"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              fullWidth
            />
            <Input
              label="Fecha límite"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              fullWidth
            />
            <Input
              label="Hora límite"
              type="time"
              value={formData.dueTime}
              onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              fullWidth
            />
          </div>

          {/* Información Técnica */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Información Técnica del Equipo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tipo de Equipo"
                value={formData.equipmentType}
                onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                placeholder="Ej: DVR, NVR, Cámara IP, Router"
                fullWidth
              />
              <Input
                label="Marca del Equipo"
                value={formData.equipmentBrand}
                onChange={(e) => setFormData({ ...formData, equipmentBrand: e.target.value })}
                placeholder="Ej: Hikvision, Dahua, Uniview"
                fullWidth
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Modelo"
                value={formData.equipmentModel}
                onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
                placeholder="Ej: DS-7608NI-K2"
                fullWidth
              />
              <Input
                label="Número de Serie"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Ej: 123456789ABC"
                fullWidth
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Fecha de Instalación"
                type="date"
                value={formData.installationDate}
                onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                fullWidth
              />
              <Input
                label="Instalado Por (Técnico)"
                value={formData.installedBy}
                onChange={(e) => setFormData({ ...formData, installedBy: e.target.value })}
                placeholder="Nombre del técnico"
                fullWidth
              />
            </div>
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.attachments.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                        {file.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          attachments: formData.attachments.filter((_, i) => i !== idx)
                        })}
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.evidence.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                        {file.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          evidence: formData.evidence.filter((_, i) => i !== idx)
                        })}
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
