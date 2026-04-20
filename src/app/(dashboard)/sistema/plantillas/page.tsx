'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Input, Select, Badge, Modal } from '@/components/ui-kit'
import { FileSpreadsheet, Upload, Edit, Trash2, File, X, FileText, Plus, Save } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: 'EDITABLE' | 'STATIC'
  fileUrl: string | null
  content: string | null
  module: string
  isActive: boolean
  company: { name: string }
  createdAt: string
}

const MODULE_OPTIONS = [
  { value: 'cotizacion', label: 'Cotizaciones' },
  { value: 'factura', label: 'Facturas' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'contrato', label: 'Contratos' },
  { value: 'orden_compra', label: 'Ordenes de Compra' },
  { value: 'gasto', label: 'Gastos' },
  { value: 'ingreso', label: 'Ingresos' },
  { value: 'otro', label: 'Otro' },
]

const TYPE_OPTIONS = [
  { value: 'EDITABLE', label: 'Editable (HTML/Editor)' },
  { value: 'STATIC', label: 'Archivo (PDF/Excel)' },
]

export default function PlantillasPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'EDITABLE' as 'EDITABLE' | 'STATIC',
    module: 'cotizacion',
    content: '',
    fileUrl: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany !== 'all') {
      fetchTemplates()
    } else {
      setTemplates([])
    }
  }, [selectedCompany])

  const fetchCompanies = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
        const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
        if (activeCompany?.id) {
          setSelectedCompany(activeCompany.id)
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const fetchTemplates = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams({ companyId: selectedCompany })
      const response = await fetch(`/api/templates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        type: template.type,
        module: template.module,
        content: template.content || '',
        fileUrl: template.fileUrl || '',
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        name: '',
        type: 'EDITABLE',
        module: 'cotizacion',
        content: '',
        fileUrl: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const token = localStorage.getItem('accessToken')
      const fd = new FormData()
      fd.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      const data = await response.json()
      if (data.success) {
        setFormData({ ...formData, fileUrl: data.data.url })
      } else {
        alert('Error al subir archivo: ' + (data.error || 'Error'))
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error al subir archivo')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !formData.name || !selectedCompany) {
      alert('Complete todos los campos requeridos')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        companyId: selectedCompany,
      }

      const method = editingTemplate ? 'PUT' : 'POST'
      const response = await fetch('/api/templates', {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTemplate ? { ...payload, id: editingTemplate.id } : payload),
      })

      const data = await response.json()
      if (data.success) {
        handleCloseModal()
        fetchTemplates()
      } else {
        alert('Error al guardar: ' + (data.error || 'Error'))
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error al guardar plantilla')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        fetchTemplates()
      } else {
        alert('Error al eliminar: ' + (data.error || 'Error'))
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error al eliminar plantilla')
    }
  }

  const getModuleLabel = (module: string) => {
    return MODULE_OPTIONS.find(m => m.value === module)?.label || module
  }

  const filteredTemplates = selectedCompany === 'all' 
    ? templates 
    : templates.filter(t => t.company?.name === companies.find(c => c.id === selectedCompany)?.name || true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra plantillas para cotizaciones, facturas, inventario y más
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          NUEVA PLANTILLA
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map(c => ({ value: c.id, label: c.name }))
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            No hay plantillas.{' '}
            <button onClick={() => handleOpenModal()} className="text-primary hover:underline">
              Crear primera plantilla
            </button>
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${template.type === 'EDITABLE' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {template.type === 'EDITABLE' ? (
                      <Edit className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-500">{getModuleLabel(template.module)}</p>
                  </div>
                </div>
                <Badge variant={template.isActive ? 'success' : 'error'}>
                  {template.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {(template.fileUrl || template.content) && (
                  <a
                    href={template.type === 'EDITABLE' 
                      ? `/sistema/plantillas/preview/${template.id}` 
                      : template.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <File className="w-4 h-4" />
                    {template.type === 'EDITABLE' ? 'Editar' : 'Ver'}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Cotización Estándar"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <Select
                options={TYPE_OPTIONS}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
              <Select
                options={MODULE_OPTIONS}
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              />
            </div>
          </div>

          {formData.type === 'STATIC' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo (PDF/Excel)</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.doc,.docx"
                onChange={handleFileUpload}
              />
              {formData.fileUrl ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <File className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 flex-1 truncate">Archivo subido</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fileUrl: '' })}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-500"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingFile ? 'Subiendo...' : 'Subir archivo'}
                </button>
              )}
            </div>
          )}

          {formData.type === 'EDITABLE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido HTML</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="<html>... contenido HTML ..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Usa {'{{variable}}'} para insertar datos dinámicos
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}