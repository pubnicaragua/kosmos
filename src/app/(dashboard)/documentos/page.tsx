'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'
import { Upload } from 'lucide-react'

interface Document {
  id: string
  name: string
  type: 'DOC' | 'PDF' | 'XLSX' | 'PNG' | 'OTHER'
  concept: string
  category: string
  area: string
  visibility: 'PRIVADO' | 'COMPARTIDO' | 'PUBLICO'
  fileUrl: string
  fileSize: number
  uploadedBy: string
  createdAt: string
  company: { name: string }
}

const AREAS = [
  'General',
  'Recursos Humanos',
  'Finanzas',
  'Legal',
  'Operaciones',
  'Marketing',
  'TI / Tecnología',
  'Ventas',
]

const VISIBILITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PRIVADO:    { label: 'Privado',    color: 'bg-red-100 text-red-700',    icon: '🔒' },
  COMPARTIDO: { label: 'Compartido', color: 'bg-yellow-100 text-yellow-700', icon: '👥' },
  PUBLICO:    { label: 'Público',    color: 'bg-green-100 text-green-700',  icon: '🌐' },
}

interface Company {
  id: string
  name: string
}

export default function DocumentosPage() {
  type DocumentFormData = {
    name: string
    type: Document['type']
    concept: string
    category: string
    area: string
    visibility: 'PRIVADO' | 'COMPARTIDO' | 'PUBLICO'
    fileUrl: string
  }

  const [documents, setDocuments] = useState<Document[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedArea, setSelectedArea] = useState('all')
  const [selectedVisibility, setSelectedVisibility] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [formData, setFormData] = useState<DocumentFormData>({
    name: '',
    type: 'PDF',
    concept: '',
    category: 'General',
    area: 'General',
    visibility: 'COMPARTIDO',
    fileUrl: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchCompanies = useCallback(async () => {
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
        if (activeCompany?.id && (selectedCompany === 'all' || !selectedCompany)) {
          setSelectedCompany(activeCompany.id)
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [selectedCompany])

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedType !== 'all') params.append('type', selectedType)
      params.append('page', currentPage.toString())
      params.append('limit', '50')

      const response = await fetch(`/api/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setDocuments(data.data.data || data.data)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedType, currentPage])

  const filteredDocuments = documents.filter(doc => {
    if (selectedArea !== 'all' && (doc.area || doc.category || 'General') !== selectedArea) return false
    if (selectedVisibility !== 'all' && (doc.visibility || 'COMPARTIDO') !== selectedVisibility) return false
    return true
  })

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreateModal = () => {
    setEditingDocumentId(null)
    setFormData({
      name: '',
      type: 'PDF',
      concept: '',
      category: selectedArea !== 'all' ? selectedArea : 'General',
      area: selectedArea !== 'all' ? selectedArea : 'General',
      visibility: 'COMPARTIDO',
      fileUrl: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (document: Document) => {
    setEditingDocumentId(document.id)
    setFormData({
      name: document.name,
      type: document.type,
      concept: document.concept,
      category: document.category || 'General',
      area: document.area || document.category || 'General',
      visibility: document.visibility || 'COMPARTIDO',
      fileUrl: document.fileUrl || '',
    })
    setIsModalOpen(true)
  }

  const handleFileUpload = async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('accessToken')
    if (!token) return null

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (data.success) return data.data.url
      alert(data.error || 'Error al subir archivo')
      return null
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error al subir archivo')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const targetCompanyId = selectedCompany !== 'all' ? selectedCompany : activeCompany.id

    if (!editingDocumentId && !targetCompanyId) {
      alert('Selecciona una empresa para subir el documento')
      return
    }

    let fileUrl = formData.fileUrl

    // Upload file if selected
    if (selectedFile) {
      const uploadedUrl = await handleFileUpload(selectedFile)
      if (!uploadedUrl) return
      fileUrl = uploadedUrl
    }

    if (!fileUrl) {
      alert('Debes seleccionar un archivo para subir')
      return
    }

    try {
      const response = await fetch(editingDocumentId ? `/api/documents/${editingDocumentId}` : '/api/documents', {
        method: editingDocumentId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fileUrl,
          category: formData.area,
          ...(editingDocumentId ? {} : { companyId: targetCompanyId, fileSize: selectedFile?.size || 1024000 }),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsModalOpen(false)
        setEditingDocumentId(null)
        setSelectedFile(null)
        fetchData()
        setFormData({
          name: '',
          type: 'PDF',
          concept: '',
          category: 'General',
          area: 'General',
          visibility: 'COMPARTIDO',
          fileUrl: '',
        })
      } else {
        alert(data.error || (editingDocumentId ? 'No se pudo actualizar el documento' : 'No se pudo subir el documento'))
      }
    } catch (error) {
      console.error('Error creating document:', error)
      alert(editingDocumentId ? 'Error al actualizar documento' : 'Error al subir documento')
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.set('companyId', selectedCompany)

      const response = await fetch(`/api/documents/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!result.success) {
        alert(result.error || 'No se pudo exportar')
        return
      }

      const rows = result.data.data as Array<Record<string, string | number | null>>
      if (!rows.length) {
        alert('No hay documentos para exportar')
        return
      }

      const headers = Object.keys(rows[0])
      const csvLines = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header] ?? ''
              const text = String(value).replace(/"/g, '""')
              return `"${text}"`
            })
            .join(',')
        ),
      ]

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', result.data.filename || `documentos_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting documents:', error)
      alert('Error al exportar documentos')
    }
  }

  const handleDelete = async (documentId: string) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este documento?')
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
      } else {
        alert(data.error || 'No se pudo eliminar el documento')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error al eliminar documento')
    }
  }

  const handleDownload = (documentUrl: string) => {
    if (!documentUrl) {
      alert('Documento sin URL de descarga')
      return
    }

    window.open(documentUrl, '_blank')
  }

  const getFileIcon = (type: string) => {
    const icons: Record<string, string> = {
      PDF: '📄',
      DOC: '📝',
      XLSX: '📊',
      PNG: '🖼️',
      OTHER: '📎',
    }
    return icons[type] || '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Organiza documentos por área con control de visibilidad.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            EXPORTAR
          </Button>
          <Button onClick={openCreateModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            SUBIR DOCUMENTO
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar: Areas */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Áreas</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedArea('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedArea === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📁 Todas las áreas
                <span className={`ml-auto float-right text-xs ${
                  selectedArea === 'all' ? 'text-blue-200' : 'text-gray-400'
                }`}>{documents.length}</span>
              </button>
              {AREAS.map(area => {
                const count = documents.filter(d => (d.area || d.category || 'General') === area).length
                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
                      selectedArea === area ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {area}
                    {count > 0 && (
                      <span className={`ml-auto float-right text-xs px-1.5 py-0.5 rounded-full ${
                        selectedArea === area ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-b border-gray-200 mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibilidad</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedVisibility('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedVisibility === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Todos
              </button>
              {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setSelectedVisibility(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
                    selectedVisibility === key ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Filters bar */}
          <div className="flex items-center gap-3 mb-4">
            <Select
              options={[
                { value: 'all', label: 'TODAS LAS EMPRESAS' },
                ...companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-52"
            />
            {['all','DOC','PDF','XLSX','PNG','OTHER'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'TODOS' : t}
              </button>
            ))}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">NOMBRE</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">ÁREA</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TIPO</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">VISIBILIDAD</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">FECHA</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TAMAÑO</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => {
                    const vis = doc.visibility || 'COMPARTIDO'
                    const visCfg = VISIBILITY_CONFIG[vis] || VISIBILITY_CONFIG.COMPARTIDO
                    return (
                      <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(doc.type)}</span>
                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                          </div>
                          {doc.concept && <div className="text-xs text-gray-400 mt-0.5 ml-7">{doc.concept}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {doc.area || doc.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">{doc.type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visCfg.color}`}>
                            {visCfg.icon} {visCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{doc.company?.name || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{new Date(doc.createdAt).toLocaleDateString('es-ES')}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{formatFileSize(doc.fileSize)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Descargar" onClick={() => handleDownload(doc.fileUrl)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Editar" onClick={() => openEditModal(doc)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button className="p-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar" onClick={() => handleDelete(doc.id)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {selectedArea !== 'all' ? `No hay documentos en el área "${selectedArea}"` : 'No se encontraron documentos'}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingDocumentId(null)
        }}
        title={editingDocumentId ? 'Editar Documento' : 'Subir Documento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Documento"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={[
                { value: 'PDF', label: 'PDF' },
                { value: 'DOC', label: 'Word (DOC)' },
                { value: 'XLSX', label: 'Excel (XLSX)' },
                { value: 'PNG', label: 'Imagen (PNG)' },
                { value: 'OTHER', label: 'Otro' },
              ]}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              fullWidth
            />
            <Select
              label="Visibilidad"
              options={[
                { value: 'PUBLICO',    label: '🌐 Público' },
                { value: 'COMPARTIDO', label: '👥 Compartido' },
                { value: 'PRIVADO',    label: '🔒 Privado' },
              ]}
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
              fullWidth
            />
          </div>
          <Select
            label="Área"
            options={AREAS.map(a => ({ value: a, label: a }))}
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value, category: e.target.value })}
            fullWidth
          />
          <Input
            label="Concepto / Descripción"
            value={formData.concept}
            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
            required
            fullWidth
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo{!editingDocumentId && <span className="text-red-500 ml-1">*</span>}</label>
            <input
              id="doc-file-upload"
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setSelectedFile(file)
              }}
              disabled={uploading}
            />
            <label htmlFor="doc-file-upload" className="cursor-pointer flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {uploading ? 'Subiendo...' : selectedFile ? selectedFile.name : editingDocumentId ? 'Subir nuevo archivo (opcional)' : 'Haz clic para seleccionar archivo'}
              </span>
            </label>
            {selectedFile && (
              <p className="text-xs text-green-600 mt-1">✓ {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setEditingDocumentId(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingDocumentId ? 'Guardar Cambios' : 'Subir Documento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
