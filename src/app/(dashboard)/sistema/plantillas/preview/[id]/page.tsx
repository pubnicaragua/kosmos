'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, Input } from '@/components/ui-kit'
import { ArrowLeft, Save, Eye } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: 'EDITABLE' | 'STATIC'
  fileUrl: string | null
  content: string | null
  module: string
  isActive: boolean
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
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setIsLoading(false)
    }
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
              <span>Usa {'{{variable}}'} parainsertar datos dinámicos:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{cliente}}'}</code>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{fecha}}'}</code>
              <code className="bg-gray-100 px-2 py-1 rounded">{'{{total}}'}</code>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="<html>... contenido HTML ..."
            />
          </div>
        ) : (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: content || '<p className="text-gray-400">Sin contenido</p>' 
            }}
          />
        )}
      </Card>
    </div>
  )
}