'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Paperclip, Clock, User, Send, Upload, FileText, Image as ImageIcon, X, Download, ZoomIn } from 'lucide-react'
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
  updatedAt: string
  evidence: string | null
  company: { name: string }
  client: { name: string } | null
}

interface TicketComment {
  id: string
  content: string
  attachmentUrl: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string; avatar: string | null }
}

const STATUS_LABELS: Record<string, string> = {
  PROCESO1: 'Proceso 1',
  PROCESO2: 'Proceso 2',
  PROCESO3: 'Proceso 3',
  PROCESO4: 'Proceso 4',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const evidenceInputRef = useRef<HTMLInputElement>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null)
  const [viewingFile, setViewingFile] = useState<{ url: string; name: string } | null>(null)
  const [evidences, setEvidences] = useState<string[]>([])

  useEffect(() => {
    if (!params.id) return
    const token = localStorage.getItem('accessToken')
    if (!token) { router.push('/login'); return }

    const load = async () => {
      try {
        const [ticketRes, commentsRes] = await Promise.all([
          fetch(`/api/tickets/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tickets/${params.id}/comments`, { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (ticketRes.status === 401) { router.push('/login'); return }

        const ticketData = await ticketRes.json()
        if (ticketData.success) {
          setTicket(ticketData.data)
          try {
            if (ticketData.data.evidence) {
              setEvidences(JSON.parse(ticketData.data.evidence))
            }
          } catch { /* ignore */ }
        }

        if (commentsRes.ok) {
          const commentsData = await commentsRes.json()
          if (commentsData.success) setComments(commentsData.data || [])
        }
      } catch (err) {
        console.error('Error loading ticket:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  const handleSendComment = async () => {
    if (!newComment.trim() && !pendingAttachment) return
    setSendingComment(true)
    setCommentError('')
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/tickets/${params.id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim() || '📎 Archivo adjunto',
          attachmentUrl: pendingAttachment?.url || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setComments((prev) => [...prev, data.data])
        setNewComment('')
        setPendingAttachment(null)
      } else {
        setCommentError(data.error || 'Error al enviar comentario')
      }
    } catch {
      setCommentError('Error de conexión')
    } finally {
      setSendingComment(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploadingFile(true)
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setPendingAttachment({ url: data.data.url, name: file.name })
      } else {
        alert('Error al subir archivo: ' + (data.error || 'Error desconocido'))
      }
    } catch {
      alert('Error al subir archivo')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleEvidenceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    
    setUploadingEvidence(true)
    const token = localStorage.getItem('accessToken')
    const newUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (data.success) {
          newUrls.push(data.data.url)
        }
      }

      if (newUrls.length > 0) {
        const updatedEvidences = [...evidences, ...newUrls]
        const updateRes = await fetch(`/api/tickets/${params.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence: updatedEvidences }),
        })
        const updateData = await updateRes.json()
        if (updateData.success) {
          setEvidences(updatedEvidences)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error al subir evidencias')
    } finally {
      setUploadingEvidence(false)
      if (evidenceInputRef.current) evidenceInputRef.current.value = ''
    }
  }

  const removeEvidence = async (url: string) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return
    const updated = evidences.filter(u => u !== url)
    const token = localStorage.getItem('accessToken')
    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence: updated }),
      })
      if (res.ok) setEvidences(updated)
    } catch {
      alert('Error al eliminar evidencia')
    }
  }

  const isImage = (url: string) => url.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
  const isPdf = (url: string) => url.startsWith('data:application/pdf') || /\.pdf$/i.test(url)
  const getFileName = (url: string) => {
    if (url.startsWith('data:')) return 'archivo'
    return url.split('/').pop() || 'archivo'
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <button onClick={() => router.push('/tickets-soporte')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a Tickets
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Ticket no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Print-only layout */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ticket-print, #ticket-print * { visibility: visible !important; }
          #ticket-print { position: fixed !important; top: 0; left: 0; width: 100%; z-index: 9999; background: white; padding: 32px; }
        }
      `}</style>
      <div id="ticket-print" style={{display:'none'}} className="bg-white font-sans text-sm text-gray-900">
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div className="text-2xl font-bold text-gray-900">{ticket.company.name}</div>
            <div className="text-gray-500 text-xs mt-1">Ticket de Soporte</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">#{ticket.id.slice(-8).toUpperCase()}</div>
            <div className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('es-NI')}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Título</div>
            <div className="font-semibold">{ticket.title}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Cliente</div>
            <div>{ticket.client?.name || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Estado</div>
            <div>{STATUS_LABELS[ticket.status] || ticket.status}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Prioridad</div>
            <div>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</div>
          </div>
          {ticket.assignedTo && (
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Asignado a</div>
              <div>{ticket.assignedTo}</div>
            </div>
          )}
          {ticket.dueDate && (
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Fecha límite</div>
              <div>{new Date(ticket.dueDate).toLocaleDateString('es-NI')}</div>
            </div>
          )}
        </div>
        {ticket.description && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Descripción</div>
            <div className="border border-gray-200 rounded p-3 bg-gray-50 text-sm whitespace-pre-wrap">{ticket.description}</div>
          </div>
        )}
        {comments.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Comentarios ({comments.length})</div>
            {comments.map((c, i) => (
              <div key={c.id} className="mb-2 border border-gray-100 rounded p-2 bg-gray-50">
                <div className="text-xs text-gray-500 mb-0.5">{c.user.name} — {new Date(c.createdAt).toLocaleString('es-NI')}</div>
                <div className="text-sm">{c.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/tickets-soporte')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-sm text-gray-500">{ticket.company.name}</p>
          </div>
        </div>
        <button
          onClick={() => {
            const el = document.getElementById('ticket-print')
            if (el) el.style.display = 'block'
            window.print()
            setTimeout(() => { if (el) el.style.display = 'none' }, 1000)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          title="Imprimir ticket"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          IMPRIMIR
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Descripción */}
          <Card>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority] || 'bg-gray-100 text-gray-600'}`}>
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(ticket.createdAt).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {ticket.description ? (
              <p className="text-gray-700 text-sm leading-relaxed">{ticket.description}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">Sin descripción</p>
            )}
          </Card>

          {/* Comentarios */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentarios <span className="text-gray-400 font-normal text-sm">({comments.length})</span>
            </h2>

            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No hay comentarios aún. Sé el primero en comentar.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-xs">
                      {comment.user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString('es-NI', { day: '2-digit', month: 'short' })}
                          {' '}
                          {new Date(comment.createdAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                      {comment.attachmentUrl && (
                        <div className="mt-2">
                          {isImage(comment.attachmentUrl) ? (
                            <button
                              onClick={() => setViewingFile({ url: comment.attachmentUrl!, name: getFileName(comment.attachmentUrl!) })}
                              className="block hover:opacity-90 transition-opacity"
                            >
                              <img src={comment.attachmentUrl} alt="adjunto" className="max-w-xs max-h-48 rounded-lg border border-gray-200 object-contain cursor-zoom-in" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setViewingFile({ url: comment.attachmentUrl!, name: getFileName(comment.attachmentUrl!) })}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver archivo adjunto
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Adjunto pendiente */}
            {pendingAttachment && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <Paperclip className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{pendingAttachment.name}</span>
                <button onClick={() => setPendingAttachment(null)} className="flex-shrink-0 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {commentError && <p className="text-xs text-red-600 mb-2">{commentError}</p>}

            <div className="flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                placeholder="Escribe un comentario... (Enter para enviar)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-gray-200"
                  title="Adjuntar archivo"
                >
                  {uploadingFile ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={handleSendComment}
                  disabled={sendingComment || (!newComment.trim() && !pendingAttachment)}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Enviar comentario"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Evidencias */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Evidencias de Trabajo
              </h2>
              <button
                onClick={() => evidenceInputRef.current?.click()}
                disabled={uploadingEvidence}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
              >
                {uploadingEvidence ? 'Subiendo...' : 'Añadir Fotos/Videos'}
              </button>
              <input 
                ref={evidenceInputRef} 
                type="file" 
                multiple 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleEvidenceSelect} 
              />
            </div>

            {evidences.length === 0 ? (
              <div 
                className="border-2 border-dashed border-gray-100 rounded-xl py-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => evidenceInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 font-medium">Sube aquí las pruebas del trabajo realizado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {evidences.map((url, i) => {
                  const isVid = /\.(mp4|webm|ogg|mov)$/i.test(url)
                  return (
                    <div key={i} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      {isVid ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="evidencia" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewingFile({ url, name: `Evidencia ${i + 1}` })}
                          className="p-1.5 bg-white rounded-full text-gray-900 hover:bg-primary hover:text-white transition-colors"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeEvidence(url)}
                          className="p-1.5 bg-white rounded-full text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {isVid && (
                        <div className="absolute bottom-1 right-1 p-1 bg-black/50 rounded text-[10px] text-white">
                          VIDEO
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Detalles</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Empresa</span>
                <span className="font-medium text-gray-900">{ticket.company.name}</span>
              </div>
              {ticket.client && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-900">{ticket.client.name}</span>
                </div>
              )}
              {ticket.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Asignado a</span>
                  <span className="font-medium text-gray-900 truncate max-w-32">{ticket.assignedTo}</span>
                </div>
              )}
              {ticket.amount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-medium text-gray-900">${ticket.amount.toLocaleString()}</span>
                </div>
              )}
              {ticket.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vencimiento</span>
                  <span className="font-medium text-gray-900">{new Date(ticket.dueDate).toLocaleDateString('es-NI')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Creado</span>
                <span className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleDateString('es-NI')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actualizado</span>
                <span className="font-medium text-gray-900">{new Date(ticket.updatedAt).toLocaleDateString('es-NI')}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historial de actividad
            </h2>
            <div className="space-y-2">
              <div className="flex gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <span>Ticket creado el {new Date(ticket.createdAt).toLocaleDateString('es-NI')}</span>
              </div>
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <span>{c.user.name} comentó el {new Date(c.createdAt).toLocaleDateString('es-NI')} a las {new Date(c.createdAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal visor de archivos */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewingFile(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{viewingFile.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={viewingFile.url}
                  download={viewingFile.name}
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="Descargar"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => setViewingFile(null)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 min-h-0">
              {isImage(viewingFile.url) ? (
                <img
                  src={viewingFile.url}
                  alt={viewingFile.name}
                  className="max-w-full max-h-full mx-auto rounded-lg object-contain"
                  style={{ maxHeight: 'calc(90vh - 80px)' }}
                />
              ) : isPdf(viewingFile.url) ? (
                <iframe
                  src={viewingFile.url}
                  className="w-full rounded-lg border border-gray-200"
                  style={{ height: 'calc(90vh - 80px)' }}
                  title={viewingFile.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-4">
                  <FileText className="w-16 h-16 text-gray-300" />
                  <p className="text-sm">Vista previa no disponible para este tipo de archivo</p>
                  <a
                    href={viewingFile.url}
                    download={viewingFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Descargar archivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
