'use client'

import { useState, useRef, useCallback } from 'react'
import { Button, Card, Input } from '@/components/ui-kit'
import { ArrowLeft, Upload, Download, Save, Plus, Trash2, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface CellData {
  row: number
  col: number
  value: string
}

export default function ExcelEditorPage() {
  const [data, setData] = useState<CellData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [fileName, setFileName] = useState('Nuevo Excel')
  const [isModified, setIsModified] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      if (jsonData.length === 0) return

      const headers = jsonData[0] || []
      setColumns(headers.map((_, i) => String.fromCharCode(65 + i)))

      const newData: CellData[] = []
      jsonData.slice(1).forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          newData.push({
            row: rowIndex + 1,
            col: colIndex,
            value: String(cell || '')
          })
        })
      })

      setData(newData)
      setFileName(file.name.replace('.xlsx', ''))
      setIsModified(false)
    } catch (error) {
      console.error('Error reading Excel:', error)
      alert('Error al leer el archivo Excel')
    }
  }, [])

  const handleCellChange = (row: number, col: number, newValue: string) => {
    setData(prev => {
      const existing = prev.find(c => c.row === row && c.col === col)
      if (existing) {
        return prev.map(c => c.row === row && c.col === col ? { ...c, value: newValue } : c)
      }
      return [...prev, { row, col, value: newValue }]
    })
    setIsModified(true)
  }

  const addRow = () => {
    const maxRow = data.reduce((max, c) => Math.max(max, c.row), 0)
    const colCount = columns.length
    for (let col = 0; col < colCount; col++) {
      handleCellChange(maxRow + 1, col, '')
    }
  }

  const addColumn = () => {
    const newCol = columns.length
    const colLetter = String.fromCharCode(65 + newCol)
    setColumns(prev => [...prev, colLetter])
    const maxRow = data.reduce((max, c) => Math.max(max, c.row), 0) || 1
    for (let row = 1; row <= maxRow; row++) {
      handleCellChange(row, newCol, '')
    }
  }

  const deleteRow = (rowIndex: number) => {
    setData(prev => prev.filter(c => c.row !== rowIndex))
    setIsModified(true)
  }

  const handleExport = () => {
    const rows: any[][] = []

    rows.push(columns)

    const maxRow = data.reduce((max, c) => Math.max(max, c.row), 0)
    for (let row = 1; row <= maxRow; row++) {
      const rowData: any[] = []
      columns.forEach((_, colIndex) => {
        const cell = data.find(c => c.row === row && c.col === colIndex)
        rowData.push(cell?.value || '')
      })
      rows.push(rowData)
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
    setIsModified(false)
  }

  const getCellValue = (row: number, col: number) => {
    const cell = data.find(c => c.row === row && c.col === col)
    return cell?.value || ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor de Excel</h1>
            <p className="text-sm text-gray-500">Importa, edita y exporta archivos Excel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button onClick={handleExport} disabled={data.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">
            No hay ningún archivo cargado.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Haz click en Importar Excel para cargar un archivo .xlsx
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar archivo
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Input
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value)
                setIsModified(true)
              }}
              className="w-64"
              placeholder="Nombre del archivo"
            />
            <Button variant="outline" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Fila
            </Button>
            <Button variant="outline" onClick={addColumn}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Columna
            </Button>
            {isModified && (
              <span className="text-sm text-amber-600">Modificado</span>
            )}
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-12 p-2 border bg-gray-100 text-center">#</th>
                  {columns.map((col, i) => (
                    <th key={i} className="p-2 border bg-gray-100 min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{col}</span>
                      </div>
                    </th>
                  ))}
                  <th className="w-12 p-2 border bg-gray-100"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(...data.map(c => c.row), 0) }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="p-2 border bg-gray-50 text-center text-sm text-gray-500">
                      {rowIndex + 1}
                    </td>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-0 border">
                        <input
                          type="text"
                          value={getCellValue(rowIndex + 1, colIndex)}
                          onChange={(e) => handleCellChange(rowIndex + 1, colIndex, e.target.value)}
                          className="w-full h-full p-2 border-none outline-none focus:bg-blue-50"
                        />
                      </td>
                    ))}
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => deleteRow(rowIndex + 1)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}