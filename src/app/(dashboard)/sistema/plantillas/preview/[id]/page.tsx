'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Input, Select } from '@/components/ui-kit'
import { ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, Save, Printer, ChevronDown } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: string
  module: string
  content: string | null
}

interface VariableMapping {
  key: string
  value: string
}

const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]
const COLORS = [
  { name: 'Negro', value: '#000000' },
  { name: 'Azul', value: '#1d4ed8' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Gris', value: '#6b7280' },
]

export default function TemplateEditorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [variables, setVariables] = useState<VariableMapping[]>([])
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [editorContent, setEditorContent] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCompanyDetails()
  }, [])

  useEffect(() => {
    if (companyDetails && isLoading) {
      fetchTemplate()
    }
  }, [companyDetails, isLoading])

  useEffect(() => {
    if (!isLoading && editorRef.current && editorContent) {
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>' || editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = editorContent
      }
    }
  }, [isLoading, editorContent])

  const fetchCompanyDetails = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success && data.data?.length > 0) {
        setCompanyDetails(data.data[0])
      }
    } catch { /* ignore */ }
  }

  const fetchTemplate = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const response = await fetch(`/api/templates?id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (data.success) {
        setTemplate(data.data)
        const initialContent = data.data.content || getDefaultTemplateContent()
        setEditorContent(initialContent)
        extractVariables(initialContent)
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultTemplateContent = () => {
    const primaryColor = companyDetails?.quotePrimaryColor || '#1d4ed8'
    return `
<div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
    <div>
      <div style="font-size: 24px; font-weight: 800; color: ${primaryColor};">${companyDetails?.name || '{{EMPRESA}}'}</div>
      <div style="font-size: 12px; color: #6b7280;">${companyDetails?.industry || ''}</div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">{{DIRECCION}}</div>
      <div style="font-size: 11px; color: #6b7280;">Tel: {{TELEFONO}} | Email: {{EMAIL}}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 28px; font-weight: 800; color: #1f2937;">PROFORMA</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
        <div style="display: flex; justify-content: flex-end; gap: 16px;">
          <span style="font-weight: 600;">FECHA</span>
          <span>{{FECHA}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 16px; margin-top: 4px; border: 1px solid ${primaryColor}; padding: 4px 8px; border-radius: 4px;">
          <span style="font-weight: 600;">VALIDO HASTA</span>
          <span>{{VALIDO_HASTA}}</span>
        </div>
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
    <div style="border: 1px solid #9ca3af;">
      <div style="background: ${primaryColor}; color: white; font-size: 11px; font-weight: 600; padding: 4px 8px;">INFORMACION</div>
      <div style="padding: 8px; font-size: 11px;">
        <div><span style="font-weight: 600;">Asesor:</span> {{ASESOR}}</div>
        <div><span style="font-weight: 600;">Email:</span> {{EMAIL_ASESOR}}</div>
        <div><span style="font-weight: 600;">Teléfono:</span> {{TELEFONO_ASESOR}}</div>
      </div>
    </div>
    <div style="border: 1px solid #9ca3af;">
      <div style="background: ${primaryColor}; color: white; font-size: 11px; font-weight: 600; padding: 4px 8px; display: flex; justify-content: space-between;">
        <span>CLIENTE:</span>
        <span style="font-weight: 800;">{{CLIENTE}}</span>
      </div>
      <div style="padding: 8px; font-size: 11px;">
        <div><span style="font-weight: 600;">Atención:</span> {{CONTACTO}}</div>
        <div><span style="font-weight: 600;">Email:</span> {{CLIENTE_EMAIL}}</div>
        <div><span style="font-weight: 600;">Teléfono:</span> {{CLIENTE_TELEFONO}}</div>
        <div><span style="font-weight: 600;">RUC:</span> {{RUC}}</div>
      </div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
    <thead>
      <tr style="background: ${primaryColor}; color: white;">
        <th style="padding: 8px; text-align: left; border: 1px solid #9ca3af;">CODIGO</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #9ca3af;">DESCRIPCION</th>
        <th style="padding: 8px; text-align: center; border: 1px solid #9ca3af;">CANT.</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #9ca3af;">PRECIO</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #9ca3af;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #d1d5db;">Item 01</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">{{PRODUCTO_1}}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">1</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 8px; border: 1px solid #d1d5db;">Item 02</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">{{PRODUCTO_2}}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">1</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
    <table style="font-size: 12px; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; background: #f3f4f6; font-weight: 600;">SUBTOTAL</td>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; background: #f3f4f6; font-weight: 600;">DESCUENTO</td>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; text-align: right;">-$0.00</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; background: #f3f4f6; font-weight: 600;">IVA (15%)</td>
        <td style="padding: 6px 12px; border: 1px solid #d1d5db; text-align: right;">$0.00</td>
      </tr>
      <tr style="background: ${primaryColor}; color: white;">
        <td style="padding: 8px 12px; font-weight: 800; font-size: 14px;">TOTAL</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-size: 14px;">$0.00</td>
      </tr>
    </table>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #374151;">
    <div style="font-size: 11px;">
      <div style="font-weight: 600; margin-bottom: 4px;">Notas:</div>
      <div>{{NOTAS}}</div>
    </div>
    <div style="font-size: 11px; margin-top: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px;">Términos y Condiciones:</div>
      <div>{{TERMINOS}}</div>
    </div>
    <div style="font-size: 11px; margin-top: 12px;">
      <div><span style="font-weight: 600;">Forma de pago:</span> {{FORMA_PAGO}}</div>
    </div>
  </div>
</div>
    `.trim()
  }

  const extractVariables = (html: string) => {
    const regex = /\{\{([^}]+)\}\}/g
    const vars = new Set<string>()
    let match
    while ((match = regex.exec(html)) !== null) {
      vars.add(match[1])
    }
    const mappings = Array.from(vars).map(key => ({
      key,
      value: ''
    }))
    setVariables(mappings)
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML)
      extractVariables(editorRef.current.innerHTML)
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !template) return
    const content = editorRef.current?.innerHTML || editorContent

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
        alert('Plantilla guardada!')
      } else {
        alert('Error al guardar')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePdf = () => {
    setShowPdfModal(true)
  }

  const handlePrintPdf = () => {
    let content = editorRef.current?.innerHTML || editorContent
    variables.forEach(v => {
      content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.value || `{{${v.key}}}`)
    })

    const printContent = document.getElementById('template-print-content')
    if (printContent) {
      printContent.innerHTML = content
    }

    window.print()
    setShowPdfModal(false)
  }

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>
  if (!template) return <div className="p-8 text-center">Plantilla no encontrada</div>

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #template-print-content, #template-print-content * { visibility: visible !important; }
          #template-print-content { position: fixed !important; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="template-print-content" className="hidden print:block" style={{display:'none'}} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/sistema/plantillas')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-sm text-gray-500">Editor Visual - Word</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGeneratePdf}>
            <Printer className="w-4 h-4 mr-2" />
            Generar PDF
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-100 border-b p-2 flex items-center gap-1 flex-wrap">
          <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-200 rounded" title="Negrita (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-200 rounded" title="Cursiva (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('underline')} className="p-2 hover:bg-gray-200 rounded" title="Subrayado (Ctrl+U)">
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded" title="Alinear Izquierda">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded" title="Centrar">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded" title="Alinear Derecha">
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <div className="relative">
            <select
              onChange={(e) => execCommand('fontSize', e.target.value)}
              className="appearance-none bg-white border rounded px-6 py-1.5 pr-6 text-sm hover:bg-gray-50 cursor-pointer"
              title="Tamaño de letra"
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              onChange={(e) => execCommand('foreColor', e.target.value)}
              className="appearance-none bg-white border rounded px-2 py-1.5 pr-6 text-sm hover:bg-gray-50 cursor-pointer"
              title="Color de texto"
            >
              {COLORS.map(c => (
                <option key={c.value} value={c.value}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            if (editorRef.current) {
              setEditorContent(editorRef.current.innerHTML)
              extractVariables(editorRef.current.innerHTML)
            }
          }}
          className="min-h-[700px] p-8 outline-none"
          style={{ fontFamily: 'Arial, sans-serif' }}
        />
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Generar PDF - Configurar Variables</h2>
            <p className="text-sm text-gray-600 mb-4">Ingresá los valores para las variables del documento:</p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {variables.map((variable, index) => (
                <div key={index} className="flex items-center gap-4">
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono w-48 flex-shrink-0">{`{{${variable.key}}}`}</code>
                  <Input
                    value={variable.value}
                    onChange={(e) => {
                      const newVars = [...variables]
                      newVars[index].value = e.target.value
                      setVariables(newVars)
                    }}
                    placeholder="Valor"
                    className="flex-1"
                  />
                </div>
              ))}
              {variables.length === 0 && (
                <p className="text-gray-500 text-sm">No hay variables en esta plantilla.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPdfModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePrintPdf}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}