'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
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
  companyId: string
  company?: {
    name: string
    logo: string | null
    industry: string | null
  }
  client: {
    name: string
    email: string | null
    phone: string | null
    contactName: string | null
    ruc?: string | null
    address?: string | null
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
  const [companyDetails, setCompanyDetails] = useState<any>(null)

  const stripKosmosBranding = (value?: string | null) =>
    (value || '').replace(/kosmos\s*crm/gi, '').replace(/kosmoscrm/gi, '').trim()

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
          // Fetch company details for print layout
          if (data.data.companyId) {
            try {
              const compRes = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` },
              })
              const compData = await compRes.json()
              if (compData.success) {
                const found = compData.data.find((c: any) => c.id === data.data.companyId)
                if (found) setCompanyDetails(found)
              }
            } catch { /* ignore */ }
          }
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

    // Generate PDF with jsPDF
    const doc = new jsPDF()
    const sym = quote.currency === 'NIO' ? 'C$' : '$'
    const companyName = companyDetails?.name || quote.company?.name || ''
    const safeCompanyName = stripKosmosBranding(companyName)
    
    let y = 20
    
    // Header
    if (safeCompanyName) {
      doc.setFontSize(20)
      doc.text(safeCompanyName, 20, y)
      y += 10
    }
    doc.setFontSize(16)
    doc.text(`PROFORMA ${quote.quoteNumber}`, 20, y)
    y += 15
    
    // Client info
    doc.setFontSize(12)
    doc.text(`Cliente: ${quote.client.name}`, 20, y)
    y += 7
    doc.text(`Email: ${quote.client.email}`, 20, y)
    y += 7
    doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString('es-NI')}`, 20, y)
    y += 7
    doc.text(`Válida hasta: ${new Date(quote.validUntil).toLocaleDateString('es-NI')}`, 20, y)
    y += 15
    
    // Items table
    doc.setFontSize(10)
    doc.text('Descripción', 20, y)
    doc.text('Cant.', 100, y)
    doc.text('Precio', 130, y)
    doc.text('Total', 170, y)
    y += 5
    doc.line(20, y, 190, y)
    y += 8
    
    quote.items.forEach((item) => {
      const desc = item.description.substring(0, 40)
      doc.text(desc, 20, y)
      doc.text(String(item.quantity), 100, y)
      doc.text(`${sym}${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, y)
      doc.text(`${sym}${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 170, y)
      y += 7
    })
    
    y += 5
    doc.line(20, y, 190, y)
    y += 10
    
    // Totals
    doc.text(`Subtotal: ${sym}${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, y)
    y += 7
    if (quote.discount > 0) {
      doc.text(`Descuento: -${sym}${quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, y)
      y += 7
    }
    if (quote.taxApplies) {
      doc.text(`IVA (15%): ${sym}${quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, y)
      y += 7
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL: ${sym}${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, y)
    y += 15
    
    // Notes
    if (quote.notes) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Notas: ${quote.notes}`, 20, y)
    }
    
    // Download PDF
    const pdfFileName = `Proforma_${quote.quoteNumber}.pdf`
    doc.save(pdfFileName)
    
    // Open email client
    const subject = `Proforma ${quote.quoteNumber}${safeCompanyName ? ` - ${safeCompanyName}` : ''}`
    const body = [
      `Estimado/a ${quote.client.contactName || quote.client.name},`,
      '',
      `Adjunto encontrará la proforma No. ${quote.quoteNumber}.`,
      '',
      `El archivo PDF ha sido descargado automáticamente. Por favor adjúntelo a este correo.`,
      '',
      `TOTAL: ${sym}${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      '',
      `Válida hasta: ${new Date(quote.validUntil).toLocaleDateString('es-NI')}`,
      '',
      'Quedamos atentos a sus comentarios.',
      '',
      `Atentamente,`,
      safeCompanyName,
    ].filter(l => l !== null && l !== undefined).join('\n')

    setTimeout(() => {
      window.open(`mailto:${quote.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    }, 500)
    
    setIsSendModalOpen(false)
  }

  const handleSendWhatsApp = () => {
    if (!quote) return

    const cleanedPhone = whatsAppNumber.replace(/[^0-9]/g, '')
    if (!cleanedPhone) {
      alert('Ingresa un número de WhatsApp válido')
      return
    }

    const sym = quote.currency === 'NIO' ? 'C$' : '$'
    const itemsText = quote.items.map((it, i) =>
      `  ${i + 1}. ${it.description} (x${it.quantity}) = ${sym}${it.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ).join('\n')

    const message = [
      `Hola ${quote.client.contactName || quote.client.name} 👋`,
      '',
      `Le compartimos nuestra Proforma *${quote.quoteNumber}*:`,
      '',
      itemsText,
      '',
      quote.discount > 0 ? `Descuento: -${sym}${quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '',
      `*TOTAL: ${sym}${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}*`,
      '',
      `📅 Válida hasta: ${new Date(quote.validUntil).toLocaleDateString('es-NI')}`,
      `💳 Pago: ${quote.paymentMethod === 'CREDITO' ? 'Crédito' : 'Contado'}`,
      '',
      '¿Desea proceder con esta proforma?',
    ].filter(Boolean).join('\n')

    window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    setIsSendModalOpen(false)
  }

  const handlePrintAndSend = () => {
    window.print()
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

  const currencySymbol = quote.currency === 'NIO' ? 'C$' : '$'

  return (
    <div className="space-y-6">
      {/* ===== PRINT-ONLY PROFORMA (hidden on screen) ===== */}
      <style>{`
        @media print {
          .screen-only { display: none !important; }
          header, nav, aside, .topbar, .sidebar, .hamburger, 
          button, [role="button"], [class*="topbar"], [class*="navbar"], 
          [class*="header"], [class*="sidebar"], [class*="hamburger"], 
          [class*="menu"], [role="navigation"], [class*="button"] { display: none !important; }
          body > div:first-child > div:first-child,
          body > div:first-child > aside,
          body > div:first-child > header,
          body > div:first-child > nav { display: none !important; }
          #proforma-print {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #proforma-print * {
            display: revert !important;
          }
          @page {
            margin: 0.5cm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div id="proforma-print" className="hidden print:block bg-white p-8 font-sans text-sm text-gray-900">
        {/* Header: Logo left, Title right */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {companyDetails?.logo ? (
              <img src={companyDetails.logo} alt={companyDetails.name} className="h-16 object-contain mb-1" />
            ) : (
              <div 
                className="text-2xl font-extrabold tracking-wider mb-1"
                style={{ color: companyDetails?.quotePrimaryColor || '#1d4ed8' }}
              >
                {stripKosmosBranding(companyDetails?.name || quote.company?.name || '') || 'EMPRESA'}
              </div>
            )}
            {companyDetails?.industry && (
              <div className="text-xs text-gray-500 italic">{companyDetails.industry}</div>
            )}
            {stripKosmosBranding(companyDetails?.quoteHeaderHtml) && (
              <div 
                className="text-[10px] text-gray-600 mt-2 max-w-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: stripKosmosBranding(companyDetails?.quoteHeaderHtml) }}
              />
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-gray-800 tracking-wider">PROFORMA {quote.quoteNumber}</div>
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex justify-end gap-4">
                <span className="font-semibold">FECHA</span>
                <span>{new Date(quote.createdAt).toLocaleDateString('es-NI')}</span>
              </div>
              <div 
                className="flex justify-end gap-4 mt-1 border px-2 py-0.5 rounded"
                style={{ borderColor: companyDetails?.quotePrimaryColor || '#16a34a' }}
              >
                <span className="font-semibold">VALIDO HASTA</span>
                <span>{new Date(quote.validUntil).toLocaleDateString('es-NI')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info table: Company info left, Client info right */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-400">
            <div 
              className="text-white text-center font-bold py-1 text-xs tracking-wider"
              style={{ backgroundColor: companyDetails?.quotePrimaryColor || '#1d4ed8' }}
            >
              INFORMACION
            </div>
            <div className="p-2 space-y-0.5 text-xs">
              <div><span className="font-semibold">Asesor:</span> {(quote as any).createdByUser?.name || 'N/A'}</div>
              <div><span className="font-semibold">Email:</span> {(quote as any).createdByUser?.email || companyDetails?.email || ''}</div>
              <div><span className="font-semibold">Teléfono:</span> {companyDetails?.phone || ''}</div>
              <div><span className="font-semibold">Empresa:</span> {companyDetails?.name || quote.company?.name || ''}</div>
              <div><span className="font-semibold">Ruc:</span> {companyDetails?.ruc || ''}</div>
            </div>
          </div>
          <div className="border border-gray-400">
            <div 
              className="text-white text-center font-bold py-1 text-xs tracking-wider flex justify-between px-3"
              style={{ backgroundColor: companyDetails?.quotePrimaryColor || '#1d4ed8' }}
            >
              <span>CLIENTE:</span>
              <span className="font-extrabold">{quote.client.name.toUpperCase()}</span>
            </div>
            <div className="p-2 space-y-0.5 text-xs">
              <div><span className="font-semibold">Atención:</span> {quote.client.contactName || ''}</div>
              <div><span className="font-semibold">Email:</span> {quote.client.email || ''}</div>
              <div><span className="font-semibold"># Telf:</span> {quote.client.phone || ''}</div>
              <div><span className="font-semibold">Ruc:</span> {quote.client.ruc || ''}</div>
              <div><span className="font-semibold">Teléfono:</span> {quote.client.phone || ''}</div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-xs mb-4">
          <thead>
            <tr className="text-white" style={{ backgroundColor: companyDetails?.quotePrimaryColor || '#1d4ed8' }}>
              <th className="border border-gray-400 px-2 py-1 text-left font-bold">CODIGO</th>
              <th className="border border-gray-400 px-2 py-1 text-left font-bold">DESCRIPCIÓN</th>
              <th className="border border-gray-400 px-2 py-1 text-center font-bold">CANT.</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-bold">PRECIO</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-bold">PRECIO TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-2 py-1">{`Item ${String(i + 1).padStart(2, '0')}`}</td>
                <td className="border border-gray-300 px-2 py-1">{item.description}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{currencySymbol} {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{currencySymbol} {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <table className="text-xs border-collapse">
            {quote.discount > 0 && (
              <tr>
                <td className="border border-gray-300 px-3 py-1 font-semibold bg-gray-100">DESCUENTO</td>
                <td className="border border-gray-300 px-3 py-1 text-right">-{currencySymbol} {quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {quote.taxApplies && (
              <tr>
                <td className="border border-gray-300 px-3 py-1 font-semibold bg-gray-100">IVA (15%)</td>
                <td className="border border-gray-300 px-3 py-1 text-right">{currencySymbol} {quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            <tr className="text-white" style={{ backgroundColor: companyDetails?.quotePrimaryColor || '#1d4ed8' }}>
              <td className="border px-3 py-1.5 font-extrabold text-sm" style={{ borderColor: companyDetails?.quotePrimaryColor || '#1e3a8a' }}>TOTAL</td>
              <td className="border px-3 py-1.5 text-right font-extrabold text-sm" style={{ borderColor: companyDetails?.quotePrimaryColor || '#1e3a8a' }}>{currencySymbol} {quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>

        {/* Notes, terms and footer */}
        <div className="space-y-4">
          {quote.notes && (
            <div className="text-xs border-t pt-2">
              <span className="font-semibold">Notas: </span>{quote.notes}
            </div>
          )}
          
          {(companyDetails?.quoteTerms || quote.terms) && (
            <div className="text-[10px] text-gray-700">
              <div className="font-bold mb-1 uppercase">Términos y Condiciones:</div>
              <div className="whitespace-pre-wrap">{companyDetails?.quoteTerms || quote.terms}</div>
            </div>
          )}

          <div className="text-xs text-gray-600">
            <span className="font-semibold">Forma de pago: </span>{quote.paymentMethod === 'CREDITO' ? 'Crédito' : 'Contado'}
          </div>

          {stripKosmosBranding(companyDetails?.quoteFooterHtml) && (
            <div 
              className="text-[10px] text-center text-gray-500 border-t pt-2"
              dangerouslySetInnerHTML={{ __html: stripKosmosBranding(companyDetails?.quoteFooterHtml) }}
            />
          )}

          <div className="text-[9px] text-center text-gray-400 border-t pt-2 mt-4">
            Generado el {new Date().toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      {/* ===== END PRINT SECTION ===== */}
      <div className="screen-only space-y-6">
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
          <Button variant="outline" onClick={() => router.push(`/clientes/cotizacion/${params.id}/editar`)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDITAR
          </Button>
          <Button variant="outline" onClick={() => {
            window.print()
          }}>
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

          {(quote.internalNotes || '').split('[DISCOUNT_APPROVAL_AUDIT]')[0].trim() && (
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
                    <span className="text-orange-600 font-semibold text-sm">
                      {(quote.internalNotes || '').split('[DISCOUNT_APPROVAL_AUDIT]')[0].trim().split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'N'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-orange-900">NOTA INTERNA:</span>
                    </div>
                    <p className="text-sm text-orange-800 whitespace-pre-wrap">
                      {(quote.internalNotes || '').split('[DISCOUNT_APPROVAL_AUDIT]')[0].trim()}
                    </p>
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
        title={`Enviar Proforma ${quote.quoteNumber}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800 mb-1">{quote.client.name}</div>
            <div className="text-gray-500 flex gap-4">
              <span>Total: <strong className="text-gray-800">{currencySymbol}{quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
              <span>Válida hasta: <strong className="text-gray-800">{new Date(quote.validUntil).toLocaleDateString('es-NI')}</strong></span>
            </div>
          </div>

          {/* Print first */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700 font-medium mb-2">📄 Paso 1: Imprimir / Guardar PDF</p>
            <p className="text-xs text-blue-600 mb-3">Genera el PDF de la proforma para adjuntarlo al email o enviarlo por WhatsApp.</p>
            <button
              onClick={handlePrintAndSend}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              IMPRIMIR / GUARDAR PDF
            </button>
          </div>

          {/* Email */}
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-700 font-medium mb-2">📧 Paso 2a: Enviar por Email</p>
            {quote.client.email ? (
              <>
                <p className="text-xs text-gray-500 mb-3">Se abrirá tu cliente de correo con asunto y cuerpo pre-llenado para <strong>{quote.client.email}</strong>.</p>
                <button
                  onClick={handleSendEmail}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium transition-colors"
                >
                  ENVIAR POR EMAIL
                </button>
              </>
            ) : (
              <p className="text-xs text-red-500">El cliente no tiene email registrado.</p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
            <p className="text-sm text-green-800 font-medium">💬 Paso 2b: Enviar por WhatsApp</p>
            <Input
              label="Número WhatsApp (con código de país)"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="Ej: 50588889999"
              fullWidth
            />
            <button
              onClick={handleSendWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.556 4.122 1.528 5.856L.057 23.882l6.204-1.628A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.52-5.185-1.424l-.371-.22-3.843 1.007 1.025-3.742-.241-.383A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              ENVIAR POR WHATSAPP
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  )
}
