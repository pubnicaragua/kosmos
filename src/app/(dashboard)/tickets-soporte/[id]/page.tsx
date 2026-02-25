'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Paperclip, Clock, User } from 'lucide-react'
import { Card } from '@/components/ui-kit/Card'
import { Badge } from '@/components/ui-kit/Badge'
import { Button } from '@/components/ui-kit/Button'

interface Ticket {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  amount: number | null
  dueDate: string | null
  assignedTo: string | null
  createdAt: string
  company: { name: string }
  client: { name: string } | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  createdBy: string
}

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  uploadedAt: string
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/tickets/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            router.push('/login')
            return
          }
          throw new Error('Error al cargar ticket')
        }

        const data = await response.json()
        setTicket(data.data || data)
      } catch (err) {
        console.error('Error fetching ticket:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTicket()
    }
  }, [params.id, router])

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/tickets/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments([...comments, data.data])
        setNewComment('')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json()
        
        const attachResponse = await fetch(`/api/tickets/${params.id}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileUrl: uploadData.data.url,
          }),
        })

        if (attachResponse.ok) {
          const attachData = await attachResponse.json()
          setAttachments([...attachments, attachData.data])
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/tickets-soporte')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Tickets
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Ticket no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <button
        onClick={() => router.push('/tickets-soporte')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{ticket.status}</Badge>
                  <Badge variant="warning">{ticket.priority}</Badge>
                </div>
              </div>
            </div>
            
            {ticket.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{ticket.description}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentarios
            </h2>
            
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No hay comentarios aún</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{comment.createdBy}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar un comentario..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                Enviar
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Archivos Adjuntos
            </h2>
            
            <div className="space-y-2 mb-4">
              {attachments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No hay archivos adjuntos</p>
              ) : (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{attachment.fileName}</span>
                    </div>
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Descargar
                    </a>
                  </div>
                ))
              )}
            </div>

            <label className="block">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button variant="outline" disabled={uploading} className="w-full">
                {uploading ? 'Subiendo...' : 'Adjuntar Archivo'}
              </Button>
            </label>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Empresa</p>
                <p className="text-sm font-medium text-gray-900">{ticket.company.name}</p>
              </div>

              {ticket.client && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cliente</p>
                  <p className="text-sm font-medium text-gray-900">{ticket.client.name}</p>
                </div>
              )}

              {ticket.assignedTo && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Asignado a</p>
                  <p className="text-sm font-medium text-gray-900">{ticket.assignedTo}</p>
                </div>
              )}

              {ticket.amount && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Monto</p>
                  <p className="text-sm font-medium text-gray-900">${ticket.amount.toLocaleString()}</p>
                </div>
              )}

              {ticket.dueDate && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Fecha de vencimiento</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(ticket.dueDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Creado</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historial
            </h2>
            <p className="text-sm text-gray-500">Próximamente: historial de cambios</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
