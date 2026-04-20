'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, Input, Select, Modal } from '@/components/ui-kit'
import { ArrowLeft, Save, Eye, FileText, Download, Printer } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: 'EDITABLE' | 'STATIC'
  fileUrl: string | null
  content: string | null
  module: string
  isActive: boolean
}

interface VariableMapping {
  key: string
  value: string
}

const SAMPLE_DATA: Record<string, string> = {
  '{{empresa}}': 'Tu Empresa XYZ',
  '{{cliente}}': 'Juan Pérez',
  '{{fecha}}': new Date().toLocaleDateString('es-ES'),
  '{{direccion}}': 'Managua, Nicaragua',
  '{{telefono}}': '+505 8888 8888',
  '{{email}}': 'juan@ejemplo.com',
  '{{total}}': '$1,500.00',
  '{{subtotal}}': '$1,300.00',
  '{{impuesto}}': '$200.00',
}

export default function TemplatePreviewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [previewData, setPreviewData] = useState<VariableMapping[]>([])
  const [showPdfModal, setShowPdfModal] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTemplate()
  }, [id])

  const fetchTemplate = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch(`/api/templates?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setTemplate(data.data)
        setContent(data.data.content || '')
        extractVariables(data.data.content || '')
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const extractVariables = (html: string) => {
    const regex = /\{\{([^}]+)\}\}/g
    const vars = new Set<string>()
    let match
    while ((match = regex.exec(html)) !== null) {
      vars.add(match[1])
    }
    const mappings = Array.from(vars).map(key => ({
      key: `{{${key}}}`,
      value: SAMPLE_DATA[key] || ''
    }))
    setPreviewData(mappings)
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !template) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/templates', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: template.id,
          content,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsEditing(false)
        extractVariables(content)
        alert('Plantilla guardada!')
      } else {
        alert('Error al guardar: ' + (data.error || 'Error'))
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const getPreviewContent = () => {
    let result = content
    previewData.forEach(mapping => {
      result = result.replace(new RegExp(mapping.key.replace('{', '\\{').replace('}', '\\}'), 'g'), mapping.value || mapping.key)
    })
    return result
  }

  const handlePrintPdf = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${template?.name || 'Documento'}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>${getPreviewContent()}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    }
  }

  const addVariable = () => {
    setPreviewData([...previewData, { key: '{{nueva}}', value: '' }])
  }

  if (isLoading) {
    return <div className="p-8 text-center">Cargando...</div>
  }

  if (!template) {
    return <div className="p-8 text-center">Plantilla no encontrada</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/sistema/plantillas')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-sm text-gray-500">
              Módulo: {template.module} | Tipo: {template.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPdfModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Generar PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isEditing ? 'Vista previa' : 'Editar'}
          </Button>
          {isEditing && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span>Usa {'{{variable}}'} para insertar datos dinámicos:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{empresa}}'}</code>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{cliente}}'}</code>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{fecha}}'}</code>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{total}}'}</code>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                extractVariables(e.target.value)
              }}
              className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="<html>... contenido HTML ..."
            />
          </div>
        ) : (
          <div 
            ref={previewRef}
            className="prose max-w-none p-8 bg-white min-h-[600px]"
            dangerouslySetInnerHTML={{ 
              __html: getPreviewContent() || '<p className="text-gray-400">Sin contenido</p>' 
            }}
          />
        )}
      </Card>

      <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Generar PDF">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Configurá los valores de las variables para el documento:
          </p>
          
          {previewData.map((mapping, index) => (
            <div key={index} className="flex items-center gap-4">
              <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono w-40">
                {mapping.key}
              </code>
              <Input
                value={mapping.value}
                onChange={(e) => {
                  const newData = [...previewData]
                  newData[index].value = e.target.value
                  setPreviewData(newData)
                }}
                placeholder="Valor"
                className="flex-1"
              />
            </div>
          ))}

          {previewData.length === 0 && (
            <p className="text-sm text-gray-400">
              No hay variables definidas. Agregá {'{{variable}}'} en el HTML.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={addVariable}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Variable
            </Button>
            <Button onClick={handlePrintPdf}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Plus(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}