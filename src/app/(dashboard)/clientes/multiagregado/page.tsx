'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Input } from '@/components/ui-kit/Input'

interface ClientRow {
  id: string
  tempId?: number
  name: string
  email: string
  phone: string
  status: string
  isNew?: boolean
}

export default function ClientesMultiagregadoPage() {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [rows, setRows] = useState<ClientRow[]>([
    { id: '', tempId: 1, name: '', email: '', phone: '', status: 'PROSPECTO', isNew: true },
  ])
  const [isSaving, setIsSaving] = useState(false)

  const addRow = () => {
    const newRow: ClientRow = {
      id: '',
      tempId: Date.now(),
      name: '',
      email: '',
      phone: '',
      status: 'PROSPECTO',
      isNew: true,
    }
    setRows([...rows, newRow])
  }

  const updateRow = (index: number, field: keyof ClientRow, value: string) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    setRows(updated)
  }

  const deleteRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || selectedCompany === 'all') {
      alert('Seleccione una empresa')
      return
    }

    const validRows = rows.filter(row => row.name.trim() !== '')
    if (validRows.length === 0) {
      alert('Agregue al menos un cliente')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/clients/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          clients: validRows.map(row => ({
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            status: row.status,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert(`${data.data.count} clientes creados exitosamente`)
        router.push('/clientes')
      } else {
        alert('Error al guardar clientes')
      }
    } catch (error) {
      console.error('Error saving clients:', error)
      alert('Error al guardar clientes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const inputs = document.querySelectorAll('input, select')
      const currentIndex = Array.from(inputs).findIndex(el => el === e.target)
      const nextInput = inputs[currentIndex + 1] as HTMLElement
      if (nextInput) nextInput.focus()
    } else if (e.key === 'Enter') {
      if (rowIndex === rows.length - 1) {
        addRow()
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes')} className="hover:text-primary">
              CLIENTES
            </button>
            <span>&gt;</span>
            <span className="text-primary font-medium">MULTIAGREGADO</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Agrega múltiples clientes desde una sola pantalla.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/clientes')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            CANCELAR
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isSaving ? 'GUARDANDO...' : 'GUARDAR'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <Select
            options={[
              { value: 'all', label: 'TODAS LAS EMPRESAS' },
              { value: 'company1', label: 'Tech Solutions' },
            ]}
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20">IMAGEN</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">NOMBRE DEL CLIENTE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">ESTADO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CORREO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TELÉFONO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.tempId || row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                      placeholder={index === rows.length - 1 ? 'Nuevo registro...' : 'Nombre del cliente'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(index, 'status', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="PROSPECTO">PROSPECTO</option>
                      <option value="PROPUESTA">PROPUESTA</option>
                      <option value="NEGOCIACION">NEGOCIACIÓN</option>
                      <option value="CALIFICADO">CALIFICADO</option>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="email"
                      value={row.email}
                      onChange={(e) => updateRow(index, 'email', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'email')}
                      placeholder={index === rows.length - 1 ? 'Correo...' : 'correo@ejemplo.com'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="tel"
                      value={row.phone}
                      onChange={(e) => updateRow(index, 'phone', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'phone')}
                      placeholder={index === rows.length - 1 ? 'Teléfono...' : '+505 0000-0000'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => deleteRow(index)}
                        className="text-error hover:text-error-dark"
                        disabled={rows.length === 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">TAB</kbd> Siguiente celda</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ENTER</kbd> Confirmar</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑</kbd> <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↓</kbd> Navegar entre filas</span>
            </div>
            <button
              onClick={addRow}
              className="text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar fila
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
