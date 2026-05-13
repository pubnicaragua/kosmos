import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseExcelFileAllSheets } from '@/lib/import-clients'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

function normalizeCurrency(value?: string): string {
  if (!value) return 'USD'
  const normalized = value.trim().toUpperCase()
  if (normalized === 'COR') return 'NIO'
  return normalized
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('companyId') as string | null

    if (!file) {
      return errorResponse('No se proporcionó archivo', 400)
    }

    if (!companyId) {
      return errorResponse('No se proporcionó empresa', 400)
    }

    const access = await getCompanyAccess(payload.userId, companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseExcelFileAllSheets(buffer)

    if (parsed.errors.length > 0) {
      return errorResponse(`Errores al procesar el archivo: ${parsed.errors.join(' | ')}`, 400)
    }

    if (!parsed.hasIncomes || parsed.incomes.length === 0) {
      return errorResponse('El archivo no contiene columnas válidas de ingresos', 400)
    }

    const imported = []
    const skipped = []

    for (const incomeData of parsed.incomes) {
      try {
        const amount = incomeData.importeMonedaFactura || incomeData.importeMonedaCobro || 0
        if (!amount || amount <= 0) {
          skipped.push({ referencia: incomeData.folio || incomeData.documento || 'N/A', reason: 'Monto inválido' })
          continue
        }

        const refNumber = incomeData.folio || incomeData.documento || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const date = incomeData.fechaEmision || new Date()

        const existing = await prisma.income.findFirst({
          where: {
            companyId,
            refNumber,
            client: incomeData.cliente,
            date,
          },
          select: { id: true },
        })

        if (existing) {
          skipped.push({ referencia: refNumber, reason: 'Ya existe' })
          continue
        }

        const created = await prisma.income.create({
          data: {
            companyId,
            refNumber,
            client: incomeData.cliente,
            concept: incomeData.documento || incomeData.origen || 'Importación de ingresos',
            method: 'Importado',
            amount,
            margin: 0,
            status: 'PAID',
            date,
            folio: incomeData.folio,
            documento: incomeData.documento,
            origen: incomeData.origen,
            currency: normalizeCurrency(incomeData.monedaFactura || incomeData.monedaCobro),
            amountSecondary:
              incomeData.importeMonedaCobro !== incomeData.importeMonedaFactura
                ? incomeData.importeMonedaCobro
                : undefined,
            currencySecondary:
              incomeData.monedaCobro && incomeData.monedaCobro !== incomeData.monedaFactura
                ? normalizeCurrency(incomeData.monedaCobro)
                : undefined,
            customFields: incomeData.customFields,
          },
        })

        imported.push(created)
      } catch (incomeError) {
        console.error('Import incomes row error:', incomeError)
        skipped.push({ referencia: incomeData.folio || incomeData.documento || 'N/A', reason: 'Error al crear' })
      }
    }

    return successResponse({
      imported: imported.length,
      skipped: skipped.length,
      details: skipped,
    })
  } catch (error) {
    console.error('Import incomes error:', error)
    return errorResponse('Error al importar ingresos', 500)
  }
}
