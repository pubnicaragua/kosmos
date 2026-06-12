'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, Package, Truck, 
  MapPin, User, Calendar, FileText, MoreHorizontal,
  ChevronRight, AlertTriangle, ExternalLink, Printer,
  Eye, CornerDownRight, ThumbsUp, ThumbsDown, Info
} from 'lucide-react'
import { 
  Button, Card, Badge, Modal 
} from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'
import { useModulePermissions } from '@/hooks/useModulePermissions'

const STATUS_CONFIG: Record<string, any> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, next: 'APROBADA' },
  APROBADA: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2, next: 'COMPRADO' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, next: null },
  COMPRADO: { label: 'Comprado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package, next: 'RECIBIDO' },
  RECIBIDO: { label: 'Recibido', color: 'bg-green-100 text-green-700 border-green-200', icon: Truck, next: null },
}

export default function DetalleSolicitudPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const permissions = useModulePermissions('solicitudes-compra', { requireAction: 'view' })
  const [request, setRequest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [quotationUrl, setQuotationUrl] = useState('')
  const [selectedQuotationUrl, setSelectedQuotationUrl] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [finalAmount, setFinalAmount] = useState('')
  const [purchaseOrderUrl, setPurchaseOrderUrl] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [isUploadingSupport, setIsUploadingSupport] = useState<'quotation' | 'purchase' | 'evidence' | null>(null)
  const [receivedItemsDraft, setReceivedItemsDraft] = useState<Record<string, { selected: boolean; receivedQuantity: number }>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeCompanyName, setActiveCompanyName] = useState<string>('')
  const [activeCompanyLogo, setActiveCompanyLogo] = useState<string>('')

  const fetchRequest = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      const res = await fetch(`/api/purchase-requests/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setRequest(data.data)
        setQuotationUrl(data.data.quotationUrl || '')
        setSelectedQuotationUrl(data.data.selectedQuotationUrl || data.data.quotationUrl || '')
        setSupplierName(data.data.supplierName || '')
        setFinalAmount(data.data.finalAmount != null ? String(data.data.finalAmount) : '')
        setPurchaseOrderUrl(data.data.purchaseOrderUrl || '')
        setEvidenceUrl(data.data.evidenceUrl || '')
        const draft = Object.fromEntries(
          (Array.isArray(data.data.items) ? data.data.items : []).map((item: any) => [
            item.id,
            { selected: true, receivedQuantity: Number(item.requestedQuantity) || 0 },
          ])
        ) as Record<string, { selected: boolean; receivedQuantity: number }>
        setReceivedItemsDraft(draft)
      } else {
        alert(data.error || 'Error al cargar detalle')
        router.push('/solicitudes-compra')
      }
    } catch (err) {
      console.error('Error loading request:', err)
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchRequest()
    const storedUser = localStorage.getItem('user')
    const storedCompany = localStorage.getItem('activeCompany')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      const parsedCompany = storedCompany ? JSON.parse(storedCompany) : null
      setCurrentUser({
        ...parsedUser,
        role: parsedCompany?.role || parsedUser.role,
      })
      if (parsedCompany?.name) setActiveCompanyName(parsedCompany.name)
      if (parsedCompany?.logoUrl || parsedCompany?.logo) setActiveCompanyLogo(parsedCompany.logoUrl || parsedCompany.logo)
    }
  }, [fetchRequest])

  const updateStatus = async (newStatus: string, extraPayload: Record<string, unknown> = {}) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsUpdating(true)
      const res = await fetch(`/api/purchase-requests/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          rejectedReason: newStatus === 'RECHAZADA' ? rejectReason : undefined,
          ...extraPayload,
        })
      })
      const data = await res.json()
      if (data.success) {
        setRequest(data.data)
        setIsRejectModalOpen(false)
        setIsApproveModalOpen(false)
        setIsPurchaseModalOpen(false)
        setIsReceiveModalOpen(false)
        setQuotationUrl(data.data.quotationUrl || '')
        setSelectedQuotationUrl(data.data.selectedQuotationUrl || data.data.quotationUrl || '')
        setSupplierName(data.data.supplierName || '')
        setFinalAmount(data.data.finalAmount != null ? String(data.data.finalAmount) : '')
        setPurchaseOrderUrl(data.data.purchaseOrderUrl || '')
        setEvidenceUrl(data.data.evidenceUrl || '')
        const draft = Object.fromEntries(
          (Array.isArray(data.data.items) ? data.data.items : []).map((item: any) => [
            item.id,
            { selected: true, receivedQuantity: Number(item.requestedQuantity) || 0 },
          ])
        ) as Record<string, { selected: boolean; receivedQuantity: number }>
        setReceivedItemsDraft(draft)
      } else {
        alert(data.error || 'Error al actualizar estado')
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const canApprove = Boolean(
    request?.canApprove ??
      (currentUser?.role === 'SUPER_ADMIN' ||
        currentUser?.role === 'ADMIN' ||
        currentUser?.role === 'MANAGER')
  )

  const quotationOptions = Array.isArray(request?.quotationFiles)
    ? request.quotationFiles.filter((url: any) => typeof url === 'string' && url.trim())
    : request?.quotationUrl
      ? [request.quotationUrl]
      : []
  const approvedAmount = Number(request?.finalAmount || 0)
  const displayAmount = approvedAmount > 0
    ? approvedAmount
    : request?.items.reduce((sum: number, i: any) => sum + (i.totalCost || 0), 0) || 0
  const totalRequestedQuantity = request?.items.reduce((sum: number, i: any) => sum + (i.requestedQuantity || 0), 0) || 0
  const canAdvanceRequest = canApprove && request?.requestedBy !== currentUser?.id
  const canReceiveUI = Boolean(
    request?.canReceive ??
      (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN')
  )
  const canReceiveRequest = canReceiveUI && request?.requestedBy !== currentUser?.id && request?.approvedBy !== currentUser?.id

  const handlePrint = () => {
    window.print()
  }

  const uploadSupportFile = async (target: 'quotation' | 'purchase' | 'evidence', file: File) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      alert('Sesión expirada')
      return
    }

    try {
      setIsUploadingSupport(target)
      const formData = new FormData()
      formData.append('file', file)
      formData.append(
        'folder',
        `purchase-requests/${request.requestNumber}/support/${target}`
      )

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!data.success || !data.data?.url) {
        alert(data.error || 'No se pudo subir el archivo')
        return
      }

      if (target === 'quotation') setQuotationUrl(data.data.url)
      if (target === 'purchase') setPurchaseOrderUrl(data.data.url)
      if (target === 'evidence') setEvidenceUrl(data.data.url)
    } catch (error) {
      console.error('Error uploading support file:', error)
      alert('Error al subir archivo')
    } finally {
      setIsUploadingSupport(null)
    }
  }

  if (isLoading || !request) {
    return <div className="p-12 text-center text-slate-400 font-bold">Cargando detalles de solicitud...</div>
  }

  const currentStatusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDIENTE
  const StatusIcon = currentStatusConfig.icon

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #po-print, #po-print * { visibility: visible !important; }
          #po-print { width: 100%; margin: 0; padding: 0 !important; }
          @page { size: letter; margin: 1cm; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto pb-20 print:pb-0 print:max-w-none print:w-full print:px-0 print:mx-0">
        <div className="print:absolute print:h-0 print:overflow-hidden print:opacity-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8 no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/solicitudes-compra')} className="rounded-full hover:bg-slate-100 p-2">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              <span>Compras</span> <ChevronRight className="w-3 h-3" /> <span>#{request.requestNumber}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de Solicitud</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold rounded-xl border-slate-200" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> IMPRIMIR
          </Button>
          {request.status === 'PENDIENTE' && canAdvanceRequest && (
            <>
              <Button 
                onClick={() => setIsRejectModalOpen(true)}
                variant="outline"
                className="font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                disabled={isUpdating}
              >
                RECHAZAR
              </Button>
              <Button 
                onClick={() => setIsApproveModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl px-8 shadow-lg shadow-blue-100"
                disabled={isUpdating}
              >
                APROBAR SOLICITUD
              </Button>
            </>
          )}
          {request.status === 'APROBADA' && canAdvanceRequest && (
            <Button 
              onClick={() => setIsPurchaseModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl px-8 shadow-lg shadow-indigo-100"
              disabled={isUpdating}
            >
              MARCAR COMO COMPRADO
            </Button>
          )}
          {request.status === 'COMPRADO' && canReceiveRequest && (
            <Button 
              onClick={() => setIsReceiveModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 font-bold rounded-xl px-8 shadow-lg shadow-green-100"
              disabled={isUpdating}
            >
              MARCAR PRODUCTOS RECIBIDOS
            </Button>
          )}
        </div>
      </div>

      {/* Print Layout */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:grid-cols-1">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-3 space-y-8 print:col-span-1">
          <Card className="p-0 border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <Badge className={`${currentStatusConfig.color} border-none font-black text-xs px-4 py-1.5 rounded-full`}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      {currentStatusConfig.label.toUpperCase()}
                    </div>
                  </Badge>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{request.requestNumber}</h2>
                    <p className="opacity-60 text-sm font-medium">{request.requestedByName || 'Sin asignar'} • {request.requestType}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{approvedAmount > 0 ? 'Monto Aprobado' : 'Monto Pendiente'}</p>
                  <p className="text-4xl font-black text-blue-400">
                    {approvedAmount > 0
                      ? `${request.currency === 'NIO' ? 'C$' : '$'}${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-3 gap-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Solicitante</p>
                    <p className="font-bold text-slate-800">{request.requestedByName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fecha Solicitud</p>
                    <p className="font-bold text-slate-800">{new Date(request.requestDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Prioridad</p>
                    <p className={`font-bold ${
                      request.priority === 'ALTA' ? 'text-red-600' :
                      request.priority === 'MEDIA' ? 'text-blue-600' :
                      'text-slate-500'
                    }`}>{request.priority}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {approvedAmount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Proveedor</p>
                    <p className="font-bold text-blue-900">{request.supplierName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Precio final</p>
                    <p className="font-black text-blue-900">
                      {request.currency === 'NIO' ? 'C$' : '$'}{approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cotizacion aprobada</p>
                    {request.selectedQuotationUrl || request.quotationUrl ? (
                      <a
                        href={request.selectedQuotationUrl || request.quotationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900"
                      >
                        Ver archivo <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="font-bold text-blue-900">N/A</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Productos Solicitados</h3>
                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">SKU / Producto</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Categoría</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Stock</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Cant.</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Motivo</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Últ. Venta</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Prom/Mes</th>
                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Total Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {request.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{item.productName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.sku || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600">{item.category || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-slate-900">{item.currentStock || 0}</span>
                              <span className="text-[9px] text-red-500">Mín: {item.minimumStock || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-blue-600 text-lg">{item.requestedQuantity}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600">{item.reason || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-slate-500">
                            {item.lastSaleDate ? new Date(item.lastSaleDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">
                            {item.monthlyAverage?.toFixed(1) || '0.0'}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">{request.currency === 'NIO' ? 'C$' : '$'}{(approvedAmount > 0 && totalRequestedQuantity > 0 ? (displayAmount * (item.requestedQuantity || 0)) / totalRequestedQuantity : item.totalCost || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {request.notes && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notas Adicionales</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{request.notes}</p>
                </div>
              )}

              {(request.purchaseOrderUrl || request.quotationUrl || request.evidenceUrl) && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Soportes</h4>
                  <div className="flex flex-wrap gap-3">
                    {request.purchaseOrderUrl && (
                      <a href={request.purchaseOrderUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                        Comprobante compra <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {request.quotationUrl && (
                      <a href={request.quotationUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                        Cotización <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {request.evidenceUrl && (
                      <a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-green-600 hover:text-green-700 inline-flex items-center gap-1">
                        Evidencia recepción <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Status Timeline & Meta */}
        <div className="space-y-8 print:hidden">
          <Card className="p-8 border-slate-100 shadow-sm rounded-3xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Estado del Proceso</h3>
            
            <div className="space-y-8 relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 -z-10" />
              
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md ${request.createdAt ? 'bg-green-500' : 'bg-slate-200'}`}>
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Solicitud Creada</p>
                  <p className="text-[10px] text-slate-400 font-medium">{new Date(request.requestDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md ${request.approvedAt ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <ThumbsUp className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Aprobada por Jefe</p>
                  {request.approvedAt ? (
                    <p className="text-[10px] text-blue-600 font-bold">{new Date(request.approvedAt).toLocaleDateString()}</p>
                  ) : <p className="text-[10px] text-slate-300 italic">Pendiente</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md ${request.purchasedAt ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                  <Package className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Compra Ejecutada</p>
                  {request.expenseId ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/finanzas/gastos/${request.expenseId}`)}
                      className="flex items-center gap-2 mt-1 text-[10px] text-indigo-600 font-bold hover:text-indigo-700"
                    >
                      Ver Gasto
                      <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                    </button>
                  ) : <p className="text-[10px] text-slate-300 italic">Pendiente</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md ${request.receivedAt ? 'bg-green-600' : 'bg-slate-200'}`}>
                  <Truck className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Productos Recibidos</p>
                  {request.receivedAt ? (
                    <p className="text-[10px] text-green-600 font-bold">Inventario actualizado</p>
                  ) : <p className="text-[10px] text-slate-300 italic">Pendiente</p>}
                </div>
              </div>
            </div>
          </Card>

          {request.rejectedReason && (
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest">Motivo de Rechazo</h4>
              </div>
              <p className="text-xs text-red-600 font-semibold leading-relaxed italic">{`"${request.rejectedReason}"`}</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Aprobar solicitud"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Cotización seleccionada *</label>
            <select
              value={selectedQuotationUrl}
              onChange={(e) => setSelectedQuotationUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar cotización...</option>
              {quotationOptions.map((url: string, index: number) => (
                <option key={url} value={url}>
                  Cotización {index + 1}
                </option>
              ))}
            </select>
            {selectedQuotationUrl && (
              <a href={selectedQuotationUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                Ver cotización <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Proveedor *</label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nombre del proveedor"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Precio Total Aprobado *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsApproveModalOpen(false)}>CANCELAR</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              disabled={isUpdating}
              onClick={() => {
                if (!selectedQuotationUrl || !supplierName.trim() || !(Number(finalAmount) > 0)) {
                  alert('Selecciona cotización, proveedor y precio final')
                  return
                }
                updateStatus('APROBADA', {
                  selectedQuotationUrl,
                  quotationUrl: selectedQuotationUrl,
                  supplierName: supplierName.trim(),
                  finalAmount: Number(finalAmount),
                })
              }}
            >
              CONFIRMAR APROBACIÓN
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Marcar compra ejecutada"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Cotización del Proveedor (opcional)</label>
            {quotationUrl ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium flex-1">Archivo subido</span>
                <button onClick={() => setQuotationUrl('')} className="text-xs text-red-600 hover:text-red-700 font-bold">Eliminar</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadSupportFile('quotation', file)
                    e.currentTarget.value = ''
                  }}
                />
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-bold text-slate-600">Subir cotización</span>
              </label>
            )}
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Comprobante de Compra *</label>
            {purchaseOrderUrl ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium flex-1">Archivo subido</span>
                <button onClick={() => setPurchaseOrderUrl('')} className="text-xs text-red-600 hover:text-red-700 font-bold">Eliminar</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 cursor-pointer transition-all">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadSupportFile('purchase', file)
                    e.currentTarget.value = ''
                  }}
                />
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-bold text-indigo-600">Subir comprobante</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsPurchaseModalOpen(false)}>CANCELAR</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
              disabled={isUpdating || isUploadingSupport !== null}
              onClick={() => {
                if (!purchaseOrderUrl.trim()) {
                  alert('Debes agregar comprobante o soporte de compra')
                  return
                }
                updateStatus('COMPRADO', {
                  quotationUrl: quotationUrl.trim() || null,
                  purchaseOrderUrl: purchaseOrderUrl.trim(),
                })
              }}
            >
              {isUploadingSupport ? 'SUBIENDO...' : 'CONFIRMAR COMPRA'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Marcar productos recibidos"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Productos a ingresar a inventario</p>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {request.items.map((item: any) => {
                const draft = receivedItemsDraft[item.id] || { selected: true, receivedQuantity: Number(item.requestedQuantity) || 0 }
                return (
                  <div key={item.id} className="grid grid-cols-[18px_1fr_88px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(e) =>
                        setReceivedItemsDraft((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...draft,
                            selected: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div className="text-xs text-slate-700 truncate" title={item.productName}>{item.productName}</div>
                    <input
                      type="number"
                      min={0}
                      max={item.requestedQuantity}
                      value={draft.receivedQuantity}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(Number(item.requestedQuantity) || 0, Number(e.target.value) || 0))
                        setReceivedItemsDraft((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...draft,
                            receivedQuantity: value,
                          },
                        }))
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    />
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Evidencia de recepción *</label>
            <input
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadSupportFile('evidence', file)
                  e.currentTarget.value = ''
                }}
              />
              <span className="px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Subir archivo a bucket</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsReceiveModalOpen(false)}>CANCELAR</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
              disabled={isUpdating || isUploadingSupport !== null}
              onClick={() => {
                if (!evidenceUrl.trim()) {
                  alert('Debes agregar evidencia de recepción')
                  return
                }
                const receivedItemsPayload = request.items
                  .map((item: any) => {
                    const draft = receivedItemsDraft[item.id] || { selected: true, receivedQuantity: Number(item.requestedQuantity) || 0 }
                    return {
                      itemId: item.id,
                      selected: draft.selected,
                      receivedQuantity: Number(draft.receivedQuantity) || 0,
                    }
                  })
                  .filter((entry: any) => entry.selected && entry.receivedQuantity > 0)

                if (receivedItemsPayload.length === 0) {
                  alert('Selecciona al menos un producto con cantidad mayor a 0')
                  return
                }

                updateStatus('RECIBIDO', {
                  evidenceUrl: evidenceUrl.trim(),
                  receivedItems: receivedItemsPayload,
                })
              }}
            >
              {isUploadingSupport ? 'SUBIENDO...' : 'CONFIRMAR RECEPCIÓN'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal 
        isOpen={isRejectModalOpen} 
        onClose={() => setIsRejectModalOpen(false)}
        title="Rechazar Solicitud"
      >
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">Por favor, indica el motivo del rechazo para informar al solicitante.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Motivo / Justificación</label>
            <textarea 
              className="w-full rounded-2xl border-2 border-slate-100 p-4 text-sm focus:border-red-500 focus:outline-none transition-all placeholder:text-slate-300 min-h-[150px]"
              placeholder="Ej: Presupuesto excedido, producto no necesario en este momento..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>CANCELAR</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              onClick={() => updateStatus('RECHAZADA')}
              disabled={!rejectReason.trim() || isUpdating}
            >
              CONFIRMAR RECHAZO
            </Button>
          </div>
        </div>
      </Modal>
      </div>

      {/* PO Print Layout */}
      <div id="po-print" className="hidden print:block font-sans text-sm text-black">
        <div className="flex justify-between items-start mb-6">
          <div className="w-1/2">
            {activeCompanyLogo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={activeCompanyLogo} alt="Logo" className="h-16 mb-2 object-contain" />
            )}
            <h1 className="text-xl font-bold uppercase">{activeCompanyName || 'NOMBRE DE LA COMPAÑÍA'}</h1>
          </div>
          <div className="text-right w-1/2">
            <h2 className="text-4xl font-bold italic mb-2 tracking-tight">Orden de compra</h2>
            <p className="text-[10px] text-gray-700 leading-tight">
              El siguiente número debe figurar en toda la<br/>correspondencia, documentación de envío y<br/>facturas relacionadas:
            </p>
            <p className="text-sm font-bold mt-2">NÚMERO DE O/C: {request.requestNumber}</p>
          </div>
        </div>

        <div className="flex gap-8 mb-6 text-xs">
           <div className="flex-1">
             <p className="font-bold mb-1">Para:</p>
             <p>{request.supplierName || 'Proveedor'}</p>
             <p>Solicitado por: {request.requestedByName || 'N/A'}</p>
             <p>Tipo: {request.requestType}</p>
           </div>
           <div className="flex-1">
             <p className="font-bold mb-1">Datos de la Empresa:</p>
             <p>{activeCompanyName || 'Empresa'}</p>
             <p className="font-bold mt-1 uppercase">ESTADO: {request.status}</p>
           </div>
        </div>

        <table className="w-full border-collapse mb-6 text-xs border border-[#005ea2]">
          <thead>
            <tr className="bg-[#005ea2] text-white text-center">
              <th className="p-2 border border-[#005ea2]">FECHA DE O/C</th>
              <th className="p-2 border border-[#005ea2]">SOLICITANTE</th>
              <th className="p-2 border border-[#005ea2]">ENVIADO MEDIANTE</th>
              <th className="p-2 border border-[#005ea2]">TÉRMINOS Y CONDICIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className="p-2 border border-[#005ea2]">{new Date(request.requestDate).toLocaleDateString('es-ES')}</td>
              <td className="p-2 border border-[#005ea2]">{request.requestedByName || 'N/A'}</td>
              <td className="p-2 border border-[#005ea2]">N/A</td>
              <td className="p-2 border border-[#005ea2]">{request.priority} Prioridad</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse mb-2 text-xs border border-[#005ea2]">
          <thead>
            <tr className="bg-[#005ea2] text-white text-center">
              <th className="p-2 border border-[#005ea2] w-16">CANTIDAD</th>
              <th className="p-2 border border-[#005ea2] w-16">UNIDAD</th>
              <th className="p-2 border border-[#005ea2]">DESCRIPCIÓN</th>
              <th className="p-2 border border-[#005ea2] w-24">PRECIO UNITARIO</th>
              <th className="p-2 border border-[#005ea2] w-24">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item: any) => {
              const qty = item.requestedQuantity || 1;
              const total = approvedAmount > 0 && totalRequestedQuantity > 0
                ? (displayAmount * qty) / totalRequestedQuantity
                : item.totalCost || 0;
              const unitPrice = total / qty;
              return (
                <tr key={item.id} className="text-center h-8">
                  <td className="p-2 border border-[#005ea2]">{qty}</td>
                  <td className="p-2 border border-[#005ea2]">UN/S</td>
                  <td className="p-2 border border-[#005ea2] text-left">
                    <span className="font-bold">{item.productName}</span>
                    {item.sku && <span className="text-gray-500 ml-1">({item.sku})</span>}
                  </td>
                  <td className="p-2 border border-[#005ea2] text-right">
                    {request.currency === 'NIO' ? 'C$' : '$'}{unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </td>
                  <td className="p-2 border border-[#005ea2] text-right">
                    {request.currency === 'NIO' ? 'C$' : '$'}{total.toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-8 text-xs">
          <div className="w-64">
            <div className="flex border border-[#005ea2] border-t-0">
              <div className="flex-1 p-2 text-right">SUBTOTAL</div>
              <div className="w-24 p-2 text-right border-l border-[#005ea2]">
                {request.currency === 'NIO' ? 'C$' : '$'}{displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex border border-[#005ea2] border-t-0">
              <div className="flex-1 p-2 text-right uppercase">Impuesto sobre las ventas</div>
              <div className="w-24 p-2 text-right border-l border-[#005ea2]">
                {request.currency === 'NIO' ? 'C$' : '$'}0.00
              </div>
            </div>
            <div className="flex border border-[#005ea2] border-t-0">
              <div className="flex-1 p-2 text-right font-bold uppercase">TOTAL</div>
              <div className="w-24 p-2 text-right border-l border-[#005ea2] font-bold bg-gray-100">
                {request.currency === 'NIO' ? 'C$' : '$'}{displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {request.notes && (
          <div className="text-[10px] mt-4">
            <p className="font-bold mb-1 uppercase text-gray-700">Notas:</p>
            <p className="text-gray-700 whitespace-pre-wrap">{request.notes}</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
