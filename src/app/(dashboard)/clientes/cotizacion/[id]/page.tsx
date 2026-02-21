'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  currency: string
  paymentMethod: 'CONTADO' | 'CREDITO'
  taxApplies: boolean
  subtotal: number
  discount: number
  tax: number
  total: number
  notes: string | null
  internalNotes: string | null
  terms: string | null
  validUntil: string
  createdAt: string
  client: {
    name: string
    email: string | null
    phone: string | null
    contactName: string | null
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    total: number
  }>
  discountApproval?: {
    status: string
    approvedBy: string
    approvedRole: string
    approvedAt: string
    comment?: string | null
    discountAmount: number
  } | null
}

export default function DetalleCotizacionPage() {
  const router = useRouter()
  const params = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [whatsAppNumber, setWhatsAppNumber] = useState('')
  const [approvalComment, setApprovalComment] = useState('')

  useEffect(() => {
    const fetchQuote = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token || !params.id) return

      try {
        const response = await fetch(`/api/quotes/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        const data = await response.json()
        if (data.success) {
          setQuote(data.data)
          setWhatsAppNumber(data.data.client?.phone || '')
        }
      } catch (error) {
        console.error('Error fetching quote:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [params.id])

  const handleApprove = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !params.id) return

    try {
      const response = await fetch(`/api/quotes/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalAction: 'APPROVE_DISCOUNT',
          comment: approvalComment,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Descuento aprobado exitosamente')
        setQuote(data.data)
        setApprovalComment('')
      }
    } catch (error) {
      console.error('Error approving quote:', error)
    }
  }

  const handleSendEmail = () => {
    if (!quote?.client.email) {
      alert('El cliente no tiene email registrado')
      return
    }

    const subject = `Cotización ${quote.quoteNumber} - ${quote.client.name}`
    const body = `Estimado/a ${quote.client.name},\n\nAdjunto encontrará la cotización ${quote.quoteNumber} por un total de ${quote.currency} ${quote.total.toLocaleString()}.\n\nVálida hasta: ${new Date(quote.validUntil).toLocaleDateString()}\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales`
    
    window.open(`mailto:${quote.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const handleSendWhatsApp = () => {
    if (!quote) return

    const cleanedPhone = whatsAppNumber.replace(/[^0-9]/g, '')
    if (!cleanedPhone) {
      alert('Ingresa un número de WhatsApp válido')
      return
    }

    const message = `Hola ${quote.client.name}, le enviamos la cotización ${quote.quoteNumber} por ${quote.currency} ${quote.total.toLocaleString()}. Válida hasta ${new Date(quote.validUntil).toLocaleDateString()}. ¿Le interesa?`

    window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleReject = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !params.id) return

    try {
      const response = await fetch(`/api/quotes/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalAction: 'REJECT_DISCOUNT',
          comment: approvalComment,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Descuento rechazado')
        setQuote(data.data)
        setApprovalComment('')
      }
    } catch (error) {
      console.error('Error rejecting quote:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cotización no encontrada</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes')} className="hover:text-primary">CLIENTES</button>
            <span>&gt;</span>
            <button onClick={() => router.push('/clientes/multiagregado')} className="hover:text-primary">MULTIAGREGADO</button>
            <span>&gt;</span>
            <span className="text-primary font-medium">COTIZACIÓN #{quote.quoteNumber}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Creada el {new Date(quote.createdAt).toLocaleDateString()} • Vence en {Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/clientes/cotizacion/nueva')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDITAR
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            IMPRIMIR
          </Button>
          <Button onClick={() => setIsSendModalOpen(true)} variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            ENVIAR AL CLIENTE
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">DETALLE DE CONCEPTOS</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">PRODUCTO/SERVICIO</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">CANT.</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">PRECIO UNIT.</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">DESC. %</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">IMPUESTO</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-sm text-gray-900">{item.description}</td>
                      <td className="py-3 px-2 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-sm text-gray-900">
                        {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-gray-900">{item.discount}%</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm text-primary font-medium">{quote.taxApplies ? 'IVA 15%' : 'NO APLICA IVA'}</span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                        {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">SUBTOTAL</span>
                <span className="font-semibold text-gray-900">
                  {quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-lg text-green-600">
                <span className="font-medium">DESCUENTO TOTAL</span>
                <span className="font-semibold">
                  -{quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">{quote.taxApplies ? 'IVA (15%)' : 'IVA (NO APLICA)'}</span>
                <span className="font-semibold text-gray-900">
                  {quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-2xl pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="font-bold text-gray-900">
                  {quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {quote.terms && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                TÉRMINOS Y CONDICIONES
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Validez de la oferta: 30 días calendario.</li>
                <li>• Forma de pago: 50% anticipo, 50% contra entrega.</li>
                <li>• Tiempo de entrega: 2 semanas post-aprobación.</li>
              </ul>
            </div>
          )}

          {quote.internalNotes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                NOTAS INTERNAS
              </h3>
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-semibold text-sm">JP</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-orange-900">NOTA DE JUAN PÉREZ:</span>
                    </div>
                    <p className="text-sm text-orange-800">{quote.internalNotes}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {quote.discount > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">APROBACIÓN DE DESCUENTOS</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Esta cotización tiene {quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })} en descuentos. Requiere aprobación de gerencia.
                </p>
              </div>
              <div className="mb-4">
                <Input
                  label="Comentario (opcional)"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Motivo de aprobación/rechazo"
                  fullWidth
                />
              </div>
              <div className="space-y-3">
                <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  APROBAR DESCUENTOS
                </Button>
                <Button onClick={handleReject} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  RECHAZAR DESCUENTOS
                </Button>
              </div>

              {quote.discountApproval && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <div><strong>Estado:</strong> {quote.discountApproval.status}</div>
                  <div><strong>Aprobado/Rechazado por:</strong> {quote.discountApproval.approvedBy}</div>
                  <div><strong>Rol:</strong> {quote.discountApproval.approvedRole}</div>
                  <div><strong>Fecha:</strong> {new Date(quote.discountApproval.approvedAt).toLocaleString('es-ES')}</div>
                  {quote.discountApproval.comment && (
                    <div><strong>Comentario:</strong> {quote.discountApproval.comment}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{quote.client.name}</h3>
            <div className="space-y-3">
              {quote.client.contactName && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-500">CONTACTO</div>
                    <div className="text-gray-900">{quote.client.contactName}</div>
                  </div>
                </div>
              )}
              {quote.client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-500">CORREO</div>
                    <div className="text-gray-900">{quote.client.email}</div>
                  </div>
                </div>
              )}
              {quote.client.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-500">TELÉFONO</div>
                    <div className="text-gray-900">{quote.client.phone}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HISTORIAL</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Hoy, 10:30 AM</div>
                  <div className="text-sm text-gray-900 font-medium">Estado cambiado a En Revisión</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-xs">JP</span>
                    </div>
                    <span className="text-xs text-gray-600">Juan Pérez</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Hoy, 09:15 AM</div>
                  <div className="text-sm text-gray-900 font-medium">Nota interna agregada</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-xs">JP</span>
                    </div>
                    <span className="text-xs text-gray-600">Juan Pérez</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Ayer, 04:00 PM</div>
                  <div className="text-sm text-gray-900 font-medium">Cotización Creada</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-xs">JP</span>
                    </div>
                    <span className="text-xs text-gray-600">Juan Pérez</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CONFIGURACIÓN</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div><strong>Forma de pago:</strong> {quote.paymentMethod === 'CREDITO' ? 'Crédito' : 'Contado'}</div>
              <div><strong>IVA:</strong> {quote.taxApplies ? 'Sí aplica IVA' : 'No aplica IVA'}</div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title="Enviar al cliente"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-700 mb-3">
              Envía la cotización {quote.quoteNumber} por email con asunto y mensaje prearmado.
            </p>
            <Button onClick={handleSendEmail} fullWidth>
              ENVIAR POR EMAIL
            </Button>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <Input
              label="Número WhatsApp destino"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="Ej: 50588889999"
              fullWidth
            />
            <Button onClick={handleSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              ENVIAR POR WHATSAPP
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
