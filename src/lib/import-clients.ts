import * as XLSX from 'xlsx'

// Mapeo flexible de columnas para diferentes empresas
const COLUMN_MAPPINGS = {
  // Nombres posibles para cada campo
  name: ['nombre', 'nombres y apellidos', 'nombres', 'cliente', 'nombre de la empresa', 'alumn@', 'alumn@ egresad@'],
  email: ['email', 'correo', 'e-mail', 'mail'],
  phone: ['telefono', 'teléfono', 'celular', 'contacto', 'telefono / estudiante', 'phone', 'numero'],
  phone2: ['telefono / tutor', 'teléfono tutor', 'telefono tutor', 'telefono 2'],
  cedula: ['cedula', 'cédula', 'ci', 'identificacion', 'item'],
  ruc: ['ruc', 'contribuyente', 'tax id'],
  alias: ['alias', 'nombre comercial'],
  codigo: ['codigo', 'código', 'item', 'nro', 'nro.'],
  curso: ['curso', 'alumn@', 'alumn@ egresad@'],
  sucursal: ['sucursal', 'branch', 'sede'],
  interes: ['interes', 'interés', 'interest'],
  observacion: ['observacion', 'observación', 'notas', 'comentarios'],
  
  // Para ingresos (Hotel Marbella)
  folio: ['nro. folio', 'folio', 'nro folio', 'numero'],
  documento: ['documento', 'factura', 'doc'],
  origen: ['origen', 'source', 'procedencia'],
  importeMonedaCobro: ['importe moneda de cobro', 'importe cobro', 'monto cobro'],
  monedaCobro: ['mon.', 'moneda', 'currency'],
  importeMonedaFactura: ['importe moneda factura', 'importe factura', 'monto factura'],
  monedaFactura: ['mon.', 'moneda factura'],
  fechaEmision: ['fecha de emisión', 'fecha de emision', 'fecha emision', 'fecha'],
}

interface ImportedClient {
  name: string
  email?: string
  phone?: string
  phone2?: string
  cedula?: string
  ruc?: string
  alias?: string
  codigoInterno?: string
  curso?: string
  sucursal?: string
  contribuyente?: string
  telefonoTutor?: string
  notes?: string
  customFields?: Record<string, any>
}

interface ImportedIncome {
  folio?: string
  documento?: string
  origen?: string
  cliente: string
  importeMonedaCobro?: number
  monedaCobro?: string
  importeMonedaFactura?: number
  monedaFactura?: string
  fechaEmision?: Date
  customFields?: Record<string, any>
}

export interface ImportResult {
  clients: ImportedClient[]
  incomes: ImportedIncome[]
  hasIncomes: boolean
  errors: string[]
}

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h))
  
  for (const possibleName of possibleNames) {
    const normalized = normalizeColumnName(possibleName)
    // Buscar coincidencia exacta primero
    let index = normalizedHeaders.findIndex(h => h === normalized)
    if (index !== -1) return index
    
    // Luego buscar coincidencias parciales
    index = normalizedHeaders.findIndex(h => h.includes(normalized) || normalized.includes(h))
    if (index !== -1) return index
  }
  
  return -1
}

function parseAmount(value: any): number | undefined {
  if (!value) return undefined
  
  const str = String(value).replace(/,/g, '')
  const num = parseFloat(str)
  
  return isNaN(num) ? undefined : num
}

function parseDate(value: any): Date | undefined {
  if (!value) return undefined
  
  // Si es un número de Excel (serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S)
  }
  
  // Si es string
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

function cleanValue(value: any): string | undefined {
  if (!value) return undefined
  const str = String(value).trim()
  return str === '' || str === 'ND' || str === 'N/A' ? undefined : str
}

function splitContacts(value: any): string[] {
  if (!value) return []
  const str = String(value).trim()
  return str.split('/').map(s => s.trim()).filter(s => s !== '')
}

export function parseExcelFile(buffer: Buffer, sheetIndex: number = 0): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[sheetIndex]
  
  if (!sheetName) {
    return { clients: [], incomes: [], hasIncomes: false, errors: ['Hoja no encontrada'] }
  }
  
  const worksheet = workbook.Sheets[sheetName]
  
  // Convertir a JSON
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  if (data.length < 2) {
    return { clients: [], incomes: [], hasIncomes: false, errors: ['El archivo está vacío o no tiene datos'] }
  }
  
  const headers = data[0].map(h => String(h || ''))
  const rows = data.slice(1).filter(row => {
    // Filtrar filas completamente vacías
    return row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
  })
  
  const clients: ImportedClient[] = []
  const incomes: ImportedIncome[] = []
  const errors: string[] = []
  
  // Detectar columnas
  const nameIdx = findColumnIndex(headers, COLUMN_MAPPINGS.name)
  const emailIdx = findColumnIndex(headers, COLUMN_MAPPINGS.email)
  const phoneIdx = findColumnIndex(headers, COLUMN_MAPPINGS.phone)
  const phone2Idx = findColumnIndex(headers, COLUMN_MAPPINGS.phone2)
  const cedulaIdx = findColumnIndex(headers, COLUMN_MAPPINGS.cedula)
  const rucIdx = findColumnIndex(headers, COLUMN_MAPPINGS.ruc)
  const aliasIdx = findColumnIndex(headers, COLUMN_MAPPINGS.alias)
  const codigoIdx = findColumnIndex(headers, COLUMN_MAPPINGS.codigo)
  const cursoIdx = findColumnIndex(headers, COLUMN_MAPPINGS.curso)
  const sucursalIdx = findColumnIndex(headers, COLUMN_MAPPINGS.sucursal)
  const interesIdx = findColumnIndex(headers, COLUMN_MAPPINGS.interes)
  const observacionIdx = findColumnIndex(headers, COLUMN_MAPPINGS.observacion)
  
  // Detectar columnas de ingresos
  const folioIdx = findColumnIndex(headers, COLUMN_MAPPINGS.folio)
  const documentoIdx = findColumnIndex(headers, COLUMN_MAPPINGS.documento)
  const origenIdx = findColumnIndex(headers, COLUMN_MAPPINGS.origen)
  const importeCobroIdx = findColumnIndex(headers, COLUMN_MAPPINGS.importeMonedaCobro)
  const monedaCobroIdx = findColumnIndex(headers, COLUMN_MAPPINGS.monedaCobro)
  const importeFacturaIdx = findColumnIndex(headers, COLUMN_MAPPINGS.importeMonedaFactura)
  const monedaFacturaIdx = findColumnIndex(headers, COLUMN_MAPPINGS.monedaFactura)
  const fechaIdx = findColumnIndex(headers, COLUMN_MAPPINGS.fechaEmision)
  
  // Detectar si tiene columnas de ingresos (más flexible)
  const hasIncomes = folioIdx !== -1 || documentoIdx !== -1 || importeCobroIdx !== -1 || importeFacturaIdx !== -1
  
  console.log('Columnas detectadas:', {
    name: nameIdx, email: emailIdx, phone: phoneIdx,
    folio: folioIdx, documento: documentoIdx, importeCobro: importeCobroIdx,
    hasIncomes
  })
  
  if (nameIdx === -1) {
    errors.push('No se encontró columna de nombre/cliente')
    return { clients: [], incomes: [], hasIncomes: false, errors }
  }
  
  // Procesar filas
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 porque Excel empieza en 1 y saltamos header
    
    const name = cleanValue(row[nameIdx])
    if (!name) continue
    
    // Crear cliente
    const client: ImportedClient = {
      name,
    }
    
    if (emailIdx !== -1) client.email = cleanValue(row[emailIdx])
    
    // Manejar teléfonos con múltiples contactos separados por "/"
    if (phoneIdx !== -1) {
      const phones = splitContacts(row[phoneIdx])
      if (phones.length > 0) {
        client.phone = phones[0]
        if (phones.length > 1 && !client.phone2) {
          client.phone2 = phones.slice(1).join(', ')
        }
      }
    }
    
    if (phone2Idx !== -1) {
      const phones2 = splitContacts(row[phone2Idx])
      if (phones2.length > 0) {
        client.telefonoTutor = phones2.join(', ')
      }
    }
    
    if (cedulaIdx !== -1) client.cedula = cleanValue(row[cedulaIdx])
    
    if (rucIdx !== -1) {
      const rucValue = cleanValue(row[rucIdx])
      if (rucValue) {
        client.ruc = rucValue
        client.contribuyente = rucValue
      }
    }
    
    if (aliasIdx !== -1) client.alias = cleanValue(row[aliasIdx])
    if (codigoIdx !== -1) client.codigoInterno = cleanValue(row[codigoIdx])
    if (cursoIdx !== -1) client.curso = cleanValue(row[cursoIdx])
    if (sucursalIdx !== -1) client.sucursal = cleanValue(row[sucursalIdx])
    
    // Campos de prospectos (interés y observación)
    const interes = interesIdx !== -1 ? cleanValue(row[interesIdx]) : undefined
    const observacion = observacionIdx !== -1 ? cleanValue(row[observacionIdx]) : undefined
    
    // Si hay interés u observación, agregarlos a notes
    if (interes || observacion) {
      const noteParts = []
      if (interes) noteParts.push(`Interés: ${interes}`)
      if (observacion) noteParts.push(`Observación: ${observacion}`)
      client.notes = noteParts.join(' | ')
    }
    
    // Campos personalizados (todo lo que no mapeamos)
    const customFields: Record<string, any> = {}
    headers.forEach((header, idx) => {
      if (idx !== nameIdx && idx !== emailIdx && idx !== phoneIdx && 
          idx !== phone2Idx && idx !== cedulaIdx && idx !== rucIdx &&
          idx !== aliasIdx && idx !== codigoIdx && idx !== cursoIdx &&
          idx !== sucursalIdx && idx !== interesIdx && idx !== observacionIdx && 
          row[idx]) {
        const value = cleanValue(row[idx])
        if (value) customFields[header] = value
      }
    })
    
    if (Object.keys(customFields).length > 0) {
      client.customFields = customFields
    }
    
    clients.push(client)
    
    // Si tiene datos de ingresos, crear ingreso
    if (hasIncomes) {
      const income: ImportedIncome = {
        cliente: client.name,
      }
      
      if (folioIdx !== -1 && row[folioIdx]) income.folio = String(row[folioIdx]).trim()
      if (documentoIdx !== -1 && row[documentoIdx]) income.documento = String(row[documentoIdx]).trim()
      if (origenIdx !== -1 && row[origenIdx]) income.origen = String(row[origenIdx]).trim()
      if (importeCobroIdx !== -1) income.importeMonedaCobro = parseAmount(row[importeCobroIdx])
      if (monedaCobroIdx !== -1 && row[monedaCobroIdx]) income.monedaCobro = String(row[monedaCobroIdx]).trim()
      if (importeFacturaIdx !== -1) income.importeMonedaFactura = parseAmount(row[importeFacturaIdx])
      if (monedaFacturaIdx !== -1 && row[monedaFacturaIdx]) income.monedaFactura = String(row[monedaFacturaIdx]).trim()
      if (fechaIdx !== -1) income.fechaEmision = parseDate(row[fechaIdx])
      
      // Solo agregar si tiene al menos un monto
      if (income.importeMonedaCobro || income.importeMonedaFactura) {
        incomes.push(income)
      }
    }
  }
  
  return { clients, incomes, hasIncomes, errors }
}

export function parseExcelFileAllSheets(buffer: Buffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  
  let allClients: ImportedClient[] = []
  let allIncomes: ImportedIncome[] = []
  let hasIncomes = false
  const errors: string[] = []
  
  // Procesar cada hoja
  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i]
    console.log(`Procesando hoja: ${sheetName}`)
    
    try {
      const result = parseExcelFile(buffer, i)
      
      // Si la hoja tiene "prospecto" en el nombre, marcar clientes como PROSPECTO
      if (sheetName.toLowerCase().includes('prospecto')) {
        result.clients.forEach(client => {
          allClients.push({
            ...client,
            customFields: {
              ...client.customFields,
              hoja: sheetName,
              esProspecto: true
            }
          })
        })
      } else {
        result.clients.forEach(client => {
          allClients.push({
            ...client,
            customFields: {
              ...client.customFields,
              hoja: sheetName
            }
          })
        })
      }
      
      allIncomes.push(...result.incomes)
      if (result.hasIncomes) hasIncomes = true
      errors.push(...result.errors)
    } catch (error) {
      console.error(`Error procesando hoja ${sheetName}:`, error)
      errors.push(`Error en hoja ${sheetName}: ${error}`)
    }
  }
  
  return {
    clients: allClients,
    incomes: allIncomes,
    hasIncomes,
    errors
  }
}
