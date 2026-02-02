'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  currency: string
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
}

export default function DetalleCotizacionPage() {
  const router = useRouter()
  const params = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Cotización aprobada exitosamente')
        setQuote(data.data)
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
    if (!quote?.client.phone) {
      alert('El cliente no tiene teléfono registrado')
      return
    }

    const message = `Hola ${quote.client.name}, le enviamos la cotización ${quote.quoteNumber} por ${quote.currency} ${quote.total.toLocaleString()}. Válida hasta ${new Date(quote.validUntil).toLocaleDateString()}. ¿Le interesa?`
    const phone = quote.client.phone.replace(/[^0-9]/g, '')
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
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
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Cotización rechazada')
        setQuote(data.data)
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
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDITAR
          </Button>
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            IMPRIMIR
          </Button>
          <Button onClick={handleSendEmail} variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            ENVIAR POR EMAIL
          </Button>
          <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            ENVIAR POR WHATSAPP
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
                        <span className="text-sm text-primary font-medium">IVA 15%</span>
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
                <span className="font-medium text-gray-700">IVA (15%)</span>
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
          {quote.total > 5000 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">APROBACIÓN DE DESCUENTOS</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Esta cotización incluye descuentos que requieren aprobación de gerencia.
                </p>
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
        </div>
      </div>
    </div>
  )
}
