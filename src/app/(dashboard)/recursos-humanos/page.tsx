'use client'

import { useState, useEffect } from 'react'
import { Download, Upload, FileText } from 'lucide-react'
import { Card, Button, Input, Badge } from '@/components/ui-kit'
import * as XLSX from 'xlsx'

interface Payroll {
  id: string
  name: string | null
  period: string
  fileName: string
  fileUrl: string
  totalAmount: number
  status: string
  notes: string | null
  createdAt: string
  expense: {
    id: string
    refNumber: string
    status: string
  } | null
}

export default function RecursosHumanosPage() {
  const [activeCompany, setActiveCompany] = useState<any>(null)
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    period: '',
    totalAmount: '',
    notes: '',
    createExpense: true,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    const company = localStorage.getItem('activeCompany')
    if (company) {
      setActiveCompany(JSON.parse(company))
    }
  }, [])

  useEffect(() => {
    if (activeCompany?.id) {
      fetchPayrolls()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  const fetchPayrolls = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/payrolls?companyId=${activeCompany.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setPayrolls(data.data)
      }
    } catch (err) {
      console.error('Error fetching payrolls:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedTestData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    const samplePeriods = [
      { period: 'Enero 2026', amount: 185000, notes: 'Planilla regular. 24 empleados activos.' },
      { period: 'Diciembre 2025', amount: 192500, notes: 'Incluye aguinaldo y bonificaciones navideñas.' },
      { period: 'Noviembre 2025', amount: 183000, notes: 'Planilla regular. 24 empleados activos.' },
      { period: 'Octubre 2025', amount: 181500, notes: 'Planilla regular con descuentos INSS.' },
      { period: 'Septiembre 2025', amount: 179000, notes: 'Planilla regular. 23 empleados activos.' },
    ]

    setLoading(true)
    try {
      for (const sample of samplePeriods) {
        await fetch('/api/payrolls', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: activeCompany.id,
            period: sample.period,
            fileName: `planilla_${sample.period.replace(' ', '_').toLowerCase()}.xlsx`,
            fileUrl: '#',
            totalAmount: sample.amount,
            notes: sample.notes,
            createExpense: true,
          }),
        })
      }
      await fetchPayrolls()
    } catch (err) {
      console.error('Error seeding test data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = [
      { Nombre: 'Juan Perez', Periodo: 'Enero 2026', Monto: 1500.50, Notas: 'Pago de salario base' },
      { Nombre: 'Maria Lopez', Periodo: 'Enero 2026', Monto: 1800.00, Notas: 'Pago base + bonos' },
    ]
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(headers)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Nomina')
    XLSX.writeFile(workbook, 'plantilla_nomina_kosmos.xlsx')
  }

  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data: any[] = XLSX.utils.sheet_to_json(ws)

      if (data.length === 0) {
        alert('El archivo esta vacio')
        return
      }

      if (confirm(`¿Desea importar ${data.length} registros de nomina?`)) {
        setLoading(true)
        const token = localStorage.getItem('accessToken')
        try {
          for (const row of data) {
            await fetch('/api/payrolls', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId: activeCompany.id,
                name: row.Nombre || 'Sin nombre',
                period: row.Periodo || 'Sin periodo',
                totalAmount: row.Monto || 0,
                notes: row.Notas || '',
                fileName: 'Importación Masiva',
                fileUrl: '#',
                createExpense: true,
              }),
            })
          }
          alert('Importación completada')
          fetchPayrolls()
        } catch (err) {
          console.error('Import error:', err)
          alert('Error durante la importación')
        } finally {
          setLoading(false)
        }
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleExport = () => {
    if (!payrolls.length) {
      alert('No hay planillas para exportar')
      return
    }

    const rows = payrolls.map((payroll) => ({
      Nombre: payroll.name || '',
      Periodo: payroll.period,
      'Monto Total': payroll.totalAmount,
      Estado: payroll.status,
      'Archivo': payroll.fileName,
      'Notas': payroll.notes || '',
      'Fecha Creación': new Date(payroll.createdAt).toLocaleDateString('es-ES'),
      'Ref Gasto': payroll.expense?.refNumber || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planillas')
    XLSX.writeFile(workbook, `planillas_${activeCompany?.name || 'empresa'}_${Date.now()}.xlsx`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !formData.period || !formData.totalAmount) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    setUploading(true)

    try {
      // 1. Subir archivo
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadData.success) {
        alert('Error al subir archivo')
        return
      }

      const payrollRes = await fetch('/api/payrolls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: activeCompany.id,
          name: formData.name,
          period: formData.period,
          fileName: selectedFile.name,
          fileUrl: uploadData.data.url,
          totalAmount: parseFloat(formData.totalAmount),
          notes: formData.notes || null,
          createExpense: formData.createExpense,
        }),
      })

      const payrollData = await payrollRes.json()
      if (payrollData.success) {
        alert('Planilla cargada exitosamente')
        setShowModal(false)
        setFormData({ name: '', period: '', totalAmount: '', notes: '', createExpense: true })
        setSelectedFile(null)
        fetchPayrolls()
      } else {
        alert(payrollData.error || 'Error al crear planilla')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al procesar planilla')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta planilla?')) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      await fetch(`/api/payrolls/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchPayrolls()
    } catch (err) {
      console.error('Error deleting payroll:', err)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      await fetch(`/api/payrolls/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchPayrolls()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: 'bg-yellow-100 text-yellow-700',
      PROCESADA: 'bg-blue-100 text-blue-700',
      PAGADA: 'bg-green-100 text-green-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recursos Humanos</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Gestión de Nómina Corporativa • {payrolls.length} Registros
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold">
            <Download className="w-4 h-4 mr-2" />
            PLANTILLA
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold pointer-events-none">
              <Upload className="w-4 h-4 mr-2" />
              IMPORTAR
            </Button>
            <input type="file" className="hidden" onChange={handleImportXLSX} accept=".xlsx,.xls" />
          </label>
          <Button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-200 font-bold">
            <Upload className="w-4 h-4 mr-2" />
            NUEVA PLANILLA
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por período, archivo, notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="text-center text-gray-500 py-8">Cargando planillas...</p>
        </Card>
      ) : payrolls.filter(p => 
          !searchTerm.trim() || 
          p.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No hay planillas cargadas</p>
            <Button onClick={() => setShowModal(true)}>Cargar primera planilla</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payrolls.filter(p => 
            !searchTerm.trim() || 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
          ).map((payroll) => (
            <Card key={payroll.id} className="group relative border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                payroll.status === 'PAGADA' ? 'bg-success' : payroll.status === 'PROCESADA' ? 'bg-primary' : 'bg-warning'
              }`}></div>
              
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1 truncate">
                      {payroll.name || 'Planilla General'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{payroll.period}</p>
                  </div>
                  <Badge variant={payroll.status === 'PAGADA' ? 'success' : payroll.status === 'PROCESADA' ? 'info' : 'warning'}>
                    {payroll.status}
                  </Badge>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monto Total</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(payroll.totalAmount)}</span>
                  </div>
                  {payroll.expense && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase">EXT: {payroll.expense.refNumber}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{payroll.fileName}</span>
                  </div>
                  {payroll.notes && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic">
                      "{payroll.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
                  <a
                    href={payroll.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[10px] font-bold p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-center uppercase tracking-widest transition-colors"
                  >
                    Descargar
                  </a>
                  <select
                    value={payroll.status}
                    onChange={(e) => handleStatusChange(payroll.id, e.target.value)}
                    className="w-24 text-[10px] font-bold px-2 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20 cursor-pointer uppercase tracking-tight"
                  >
                    <option value="PENDIENTE">PEND.</option>
                    <option value="PROCESADA">PROC.</option>
                    <option value="PAGADA">PAGADA</option>
                  </select>
                  <button
                    onClick={() => handleDelete(payroll.id)}
                    className="p-2 text-slate-300 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para cargar planilla */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Cargar Planilla</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nombre / Empleado"
                placeholder="Ej: Juan Pérez o Planilla de Ventas"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <Input
                label="Período"
                placeholder="Ej: Enero 2026"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                required
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total de la Planilla *
                  <span className="ml-1 text-xs font-normal text-gray-400">(suma total de salarios a pagar)</span>
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-sm text-gray-600">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    required
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Este monto se registrará como gasto de nómina si activas la opción de abajo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo de planilla (Excel, PDF, etc.)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.pdf,.csv"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">Archivo: {selectedFile.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createExpense"
                  checked={formData.createExpense}
                  onChange={(e) => setFormData({ ...formData, createExpense: e.target.checked })}
                  className="w-4 h-4 rounded text-primary border-gray-300"
                />
                <label htmlFor="createExpense" className="text-sm text-gray-700">
                  Crear gasto automáticamente en el módulo de Gastos
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ period: '', totalAmount: '', notes: '', createExpense: true })
                    setSelectedFile(null)
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Cargando...' : 'Guardar Planilla'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
