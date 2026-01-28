'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'

interface Ticket {
  id: string
  title: string
  description: string | null
  status: 'PROCESO1' | 'PROCESO2' | 'PROCESO3' | 'PROCESO4'
  priority: string
  amount: number | null
  dueDate: string | null
  client: { name: string } | null
  assignedTo: string | null
}

const COLUMNS = [
  { id: 'PROCESO1', label: 'PROCESO1', color: 'border-red-400' },
  { id: 'PROCESO2', label: 'PROCESO2', color: 'border-blue-400' },
  { id: 'PROCESO3', label: 'PROCESO3', color: 'border-yellow-400' },
  { id: 'PROCESO4', label: 'PROCESO4', color: 'border-green-400' },
]

export default function TicketsSoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)

      const response = await fetch(`/api/tickets?${params}`, {
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
  }, [selectedCompany])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getTicketsByStatus = (status: string) => {
    return tickets.filter(t => t.status === status)
  }

  const getTotalAmount = (status: string) => {
    return getTicketsByStatus(status).reduce((sum, t) => sum + (t.amount || 0), 0)
  }

  const handleDragStart = (ticketId: string) => {
    setDraggedTicket(ticketId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedTicket) return

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
      if (data.success) {
        setTickets(tickets.map(t =>
          t.id === draggedTicket ? { ...t, status: newStatus as any } : t
        ))
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
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
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR
          </Button>
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDITAR
          </Button>
          <Button>
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
            { value: 'company1', label: 'Tech Solutions' },
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-56"
        />
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-700">ÚLTIMO MES</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTickets = getTicketsByStatus(column.id)
          const totalAmount = getTotalAmount(column.id)

          return (
            <div
              key={column.id}
              className="bg-white rounded-lg shadow"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} rounded-t-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  <span className="text-sm text-gray-500">{columnTickets.length}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</div>
              </div>

              <div className="p-4 space-y-3 min-h-[400px]">
                {columnTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm">Arrastra tickets aquí</p>
                  </div>
                ) : (
                  columnTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={() => handleDragStart(ticket.id)}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="warning">Pendiente</Badge>
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
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
