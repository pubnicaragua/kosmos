import * as XLSX from 'xlsx'

interface ExportOptions {
  data: Record<string, any>[]
  filename: string
  sheetName?: string
  companyName?: string
  companyLogo?: string | null
  title?: string
  includeHeader?: boolean
}

/**
 * Exporta datos a Excel con encabezado de empresa y logo
 */
export function exportToExcelWithLogo(options: ExportOptions): void {
  const {
    data,
    filename,
    sheetName = 'Datos',
    companyName,
    companyLogo,
    title,
    includeHeader = true,
  } = options

  if (!data.length) {
    alert('No hay datos para exportar')
    return
  }

  const workbook = XLSX.utils.book_new()
  
  // Crear array de arrays para el contenido
  const rows: any[][] = []
  
  // Agregar encabezado profesional con info de empresa
  if (includeHeader && (companyName || title)) {
    // Fila con nombre de empresa (estilo header)
    if (companyName) {
      rows.push([companyName.toUpperCase()])
      rows.push([]) // Fila vacía
    }
    
    // Fila con título del reporte (estilo título)
    if (title) {
      rows.push([title.toUpperCase()])
      rows.push([]) // Fila vacía
    }
    
    // Fecha de generación
    rows.push([`Generado: ${new Date().toLocaleDateString('es-NI', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`])
    rows.push([]) // Fila vacía
    rows.push([]) // Fila vacía adicional
  }

  // Agregar encabezados de columnas (en mayúsculas para profesionalismo)
  const headers = Object.keys(data[0])
  rows.push(headers.map(h => h.toUpperCase()))

  // Agregar datos
  data.forEach(row => {
    rows.push(headers.map(h => row[h] ?? ''))
  })

  // Crear worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Ajustar anchos de columna (más generosos)
  const colWidths = headers.map(h => ({
    wch: Math.max(h.length + 4, ...data.map(row => String(row[h] ?? '').length + 2))
  }))
  worksheet['!cols'] = colWidths

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Descargar archivo
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/**
 * Obtiene la empresa activa del localStorage
 */
export function getActiveCompanyInfo(): { id: string; name: string; logo: string | null } | null {
  try {
    const stored = localStorage.getItem('activeCompany')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch { /* ignore */ }
  return null
}

/**
 * Helper para exportar con la empresa activa
 */
export function exportWithCompanyHeader(
  data: Record<string, any>[],
  filename: string,
  title: string,
  companies?: { id: string; name: string; logo: string | null }[],
  selectedCompanyId?: string
): void {
  let companyName: string | undefined
  let companyLogo: string | null | undefined

  // Intentar obtener info de empresa
  if (selectedCompanyId && selectedCompanyId !== 'all' && companies) {
    const company = companies.find(c => c.id === selectedCompanyId)
    if (company) {
      companyName = company.name
      companyLogo = company.logo
    }
  } else {
    const activeCompany = getActiveCompanyInfo()
    if (activeCompany) {
      companyName = activeCompany.name
      companyLogo = activeCompany.logo
    }
  }

  exportToExcelWithLogo({
    data,
    filename,
    title,
    companyName,
    companyLogo,
  })
}
