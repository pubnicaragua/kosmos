'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Payroll {
  id: string
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
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
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

  const handleExport = () => {
    if (!payrolls.length) {
      alert('No hay planillas para exportar')
      return
    }

    const rows = payrolls.map((payroll) => ({
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

      // 2. Crear planilla
      const payrollRes = await fetch('/api/payrolls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: activeCompany.id,
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
        setFormData({ period: '', totalAmount: '', notes: '', createExpense: true })
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
          <h1 className="text-2xl font-semibold text-gray-900">Recursos Humanos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de planillas de nómina</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} disabled={payrolls.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button variant="outline" onClick={handleSeedTestData} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Datos de Prueba
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Cargar Planilla
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="text-center text-gray-500 py-8">Cargando planillas...</p>
        </Card>
      ) : payrolls.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No hay planillas cargadas</p>
            <Button onClick={() => setShowModal(true)}>Cargar primera planilla</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payrolls.map((payroll) => (
            <Card key={payroll.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{payroll.period}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(payroll.status)}`}>
                      {payroll.status}
                    </span>
                    {payroll.expense && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                        💰 Gasto: {payroll.expense.refNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Monto total:</strong> {formatCurrency(payroll.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Archivo:</strong> {payroll.fileName}
                  </p>
                  {payroll.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Notas:</strong> {payroll.notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Cargado: {new Date(payroll.createdAt).toLocaleDateString('es-NI')}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={payroll.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-center"
                  >
                    📥 Descargar
                  </a>
                  <select
                    value={payroll.status}
                    onChange={(e) => handleStatusChange(payroll.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PROCESADA">Procesada</option>
                    <option value="PAGADA">Pagada</option>
                  </select>
                  <button
                    onClick={() => handleDelete(payroll.id)}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    🗑️ Eliminar
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
