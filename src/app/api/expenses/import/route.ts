import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import * as XLSX from 'xlsx'

// Mapeo de columnas en español e inglés
const EXPENSE_COLUMN_MAPPINGS = {
  provider: ['proveedor', 'provider', 'vendor', 'empresa', 'nombre proveedor', 'supplier'],
  concept: ['concepto', 'concept', 'descripcion', 'descripción', 'description', 'detalle'],
  amount: ['monto', 'amount', 'total', 'valor', 'importe', 'precio', 'price', 'costo', 'cost'],
  date: ['fecha', 'date', 'fecha pago', 'fecha gasto', 'payment date'],
  refNumber: ['referencia', 'ref', 'numero', 'número', 'no.', 'folio', 'factura', 'invoice', 'comprobante'],
  category: ['categoria', 'categoría', 'category', 'tipo', 'type', 'rubro'],
  status: ['estado', 'status', 'situacion', 'situación'],
  currency: ['moneda', 'currency', 'divisa', 'mon.'],
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
    let index = normalizedHeaders.findIndex(h => h === normalized)
    if (index !== -1) return index
    
    index = normalizedHeaders.findIndex(h => h.includes(normalized) || normalized.includes(h))
    if (index !== -1) return index
  }
  
  return -1
}

function parseAmount(value: any): number | undefined {
  if (!value) return undefined
  const str = String(value).replace(/,/g, '').replace(/\$/g, '').replace(/C\$/g, '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? undefined : num
}

function parseDate(value: any): Date | undefined {
  if (!value) return undefined
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return new Date(date.y, date.m - 1, date.d)
  }
  
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const contentType = request.headers.get('content-type') || ''
    
    // Soporte para JSON (legacy) y FormData (nuevo)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { companyId, expenses } = body

      const access = await getCompanyAccess(decoded.userId, companyId)
      if (!access.canAccess) {
        return apiError('No tienes acceso a esta empresa', 403)
      }

      const created = await prisma.expense.createMany({
        data: expenses.map((exp: any) => ({
          ...exp,
          companyId,
          date: new Date(exp.date),
        })),
      })

      return apiSuccess({
        message: `${created.count} gastos importados exitosamente`,
        imported: created.count,
        skipped: 0,
      })
    }

    // Procesar archivo Excel
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('companyId') as string | null

    if (!file) {
      return apiError('No se proporcionó archivo', 400)
    }

    if (!companyId) {
      return apiError('No se proporcionó empresa', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    const imported = []
    const skipped = []

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (data.length < 2) continue
      
      const headers = data[0].map(h => String(h || ''))
      const rows = data.slice(1).filter(row => 
        row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      )

      // Detectar columnas
      const providerIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.provider)
      const conceptIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.concept)
      const amountIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.amount)
      const dateIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.date)
      const refIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.refNumber)
      const categoryIdx = findColumnIndex(headers, EXPENSE_COLUMN_MAPPINGS.category)

      console.log(`Hoja ${sheetName} - Columnas:`, { providerIdx, conceptIdx, amountIdx, dateIdx, refIdx })

      if (amountIdx === -1) {
        skipped.push({ hoja: sheetName, reason: 'No se encontró columna de monto' })
        continue
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        
        try {
          const amount = parseAmount(row[amountIdx])
          if (!amount || amount <= 0) {
            skipped.push({ fila: i + 2, reason: 'Monto inválido' })
            continue
          }

          const provider = providerIdx !== -1 ? String(row[providerIdx] || '').trim() : 'Importado'
          const concept = conceptIdx !== -1 ? String(row[conceptIdx] || '').trim() : 'Gasto importado'
          const date = dateIdx !== -1 ? parseDate(row[dateIdx]) : new Date()
          const refNumber = refIdx !== -1 ? String(row[refIdx] || '').trim() : `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
          const category = categoryIdx !== -1 ? String(row[categoryIdx] || '').trim() : 'General'

          // Verificar duplicados
          const existing = await prisma.expense.findFirst({
            where: {
              companyId,
              refNumber,
              provider,
              amount,
            },
            select: { id: true },
          })

          if (existing) {
            skipped.push({ referencia: refNumber, reason: 'Ya existe' })
            continue
          }

          const created = await prisma.expense.create({
            data: {
              companyId,
              provider,
              concept,
              amount,
              date: date || new Date(),
              refNumber,
              category,
              method: 'Importado',
              status: 'PAID',
            },
          })

          imported.push(created)
        } catch (rowError) {
          console.error(`Error fila ${i + 2}:`, rowError)
          skipped.push({ fila: i + 2, reason: 'Error al crear' })
        }
      }
    }

    return apiSuccess({
      imported: imported.length,
      skipped: skipped.length,
      details: skipped,
    })
  } catch (error) {
    console.error('Error importing expenses:', error)
    return apiError('Error al importar gastos', 500)
  }
}
