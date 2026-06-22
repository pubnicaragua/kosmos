'use client'

import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface SimpleRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SimpleRichTextEditor({ value, onChange, disabled }: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const execCommand = (command: string, cmdValue?: string) => {
    if (disabled) return
    document.execCommand(command, false, cmdValue)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-gray-100 border-b px-2 py-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Subrayado (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Alinear Izquierda"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Centrar"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Alinear Derecha"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML)
          }
        }}
        className="min-h-[100px] p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        style={{ fontFamily: 'Arial, sans-serif' }}
      />
    </div>
  )
}