'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'
import { Modal } from '@/components/ui-kit/Modal'
import { Input } from '@/components/ui-kit/Input'

interface Document {
  id: string
  name: string
  type: 'DOC' | 'PDF' | 'XLSX' | 'PNG' | 'OTHER'
  concept: string
  category: string
  fileUrl: string
  fileSize: number
  uploadedBy: string
  createdAt: string
  company: { name: string }
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
    fileUrl: string
  }

  const [documents, setDocuments] = useState<Document[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [formData, setFormData] = useState<DocumentFormData>({
    name: '',
    type: 'PDF',
    concept: '',
    category: 'General',
    fileUrl: '',
  })

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
      params.append('limit', '10')

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
      category: 'General',
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
      fileUrl: document.fileUrl || '',
    })
    setIsModalOpen(true)
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

    try {
      const response = await fetch(editingDocumentId ? `/api/documents/${editingDocumentId}` : '/api/documents', {
        method: editingDocumentId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...(editingDocumentId ? {} : { companyId: targetCompanyId, fileSize: 1024000 }),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsModalOpen(false)
        setEditingDocumentId(null)
        fetchData()
        setFormData({
          name: '',
          type: 'PDF',
          concept: '',
          category: 'General',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona y organiza todos los documentos corporativos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DESCARGAR DOCUMENTOS
          </Button>
          <Button onClick={openCreateModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            SUBIR DOCUMENTO
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
          className="w-56"
        />
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            TODAS
          </button>
          <button
            onClick={() => setSelectedType('DOC')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'DOC'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            DOC
          </button>
          <button
            onClick={() => setSelectedType('PDF')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'PDF'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PDF
          </button>
          <button
            onClick={() => setSelectedType('XLSX')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'XLSX'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            XLSX
          </button>
          <button
            onClick={() => setSelectedType('PNG')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'PNG'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PNG
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">EMPRESA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">NOMBRE</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TIPO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CONCEPTO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">FECHA SUBIDA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">TAMAÑO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{doc.company?.name || 'N/A'}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getFileIcon(doc.type)}</span>
                      <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{doc.type}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{doc.concept}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">{formatFileSize(doc.fileSize)}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-primary hover:text-primary-dark" onClick={() => handleDownload(doc.fileUrl)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button className="text-gray-600 hover:text-gray-900" onClick={() => openEditModal(doc)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="text-error hover:text-error-dark" onClick={() => handleDelete(doc.id)}>
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

        {documents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron documentos
          </div>
        )}
      </Card>

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
          <Input
            label="Concepto"
            value={formData.concept}
            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            fullWidth
          />
          <Input
            label="URL del Archivo"
            value={formData.fileUrl}
            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
            placeholder="/uploads/documents/archivo.pdf"
            required
            fullWidth
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> En producción, aquí iría un componente de upload real que suba el archivo a un servicio de storage (AWS S3, Cloudflare R2, etc.)
            </p>
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
