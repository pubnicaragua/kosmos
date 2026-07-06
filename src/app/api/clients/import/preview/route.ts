import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExcelFileAllSheets } from '@/lib/import-clients'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { validateRowFormat, findFileDuplicates, groupErrors } from '@/lib/client-validations'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se proporcionó archivo' }, { status: 400 })
    }
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'No se proporcionó empresa' }, { status: 400 })
    }

    const access = await getCompanyAccess(payload.userId, companyId)
    if (!access.canAccess) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const moduleAccess = await getModuleAccess(payload.userId, companyId, 'clientes')
    if (!moduleAccess.canCreate) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para crear/importar clientes' }, { status: 403 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = parseExcelFileAllSheets(buffer)

    if (result.clients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron datos válidos en el archivo',
        details: result.errors,
      }, { status: 400 })
    }

    // Batch fetch all existing cedulas/rucs for this company (single query)
    const existingClients = await prisma.client.findMany({
      where: { companyId },
      select: { name: true, cedula: true, ruc: true },
    })
    const cedulaMap = new Map<string, string>()
    const rucMap = new Map<string, string>()
    for (const c of existingClients) {
      if (c.cedula) cedulaMap.set(c.cedula, c.name)
      if (c.ruc) rucMap.set(c.ruc, c.name)
    }

    const validRows: { rowIndex: number; data: (typeof result.clients)[0] }[] = []
    const invalidRows: { rowIndex: number; data: (typeof result.clients)[0]; errors: string[] }[] = []
    const allErrors: { field: string; message: string }[] = []

    for (let i = 0; i < result.clients.length; i++) {
      const clientData = result.clients[i]
      const rowErrors: string[] = []

      const formatErrors = validateRowFormat(clientData)
      formatErrors.forEach(e => {
        rowErrors.push(e.message)
        allErrors.push(e)
      })

      const fileDuplicates = findFileDuplicates(result.clients, i)
      fileDuplicates.forEach(e => {
        rowErrors.push(e.message)
        allErrors.push(e)
      })

      // Check against batch-loaded DB maps
      if (clientData.ruc?.trim()) {
        const owner = rucMap.get(clientData.ruc.trim())
        if (owner) {
          const msg = `RUC "${clientData.ruc}" ya está registrado en cliente "${owner}"`
          rowErrors.push(msg)
          allErrors.push({ field: 'ruc', message: msg })
        }
      }
      if (clientData.cedula?.trim()) {
        const owner = cedulaMap.get(clientData.cedula.trim())
        if (owner) {
          const msg = `Cédula "${clientData.cedula}" ya está registrada en cliente "${owner}"`
          rowErrors.push(msg)
          allErrors.push({ field: 'cedula', message: msg })
        }
      }

      if (rowErrors.length > 0) {
        invalidRows.push({ rowIndex: i, data: clientData, errors: rowErrors })
      } else {
        validRows.push({ rowIndex: i, data: clientData })
      }
    }

    const errorSummary = groupErrors(allErrors)

    return NextResponse.json({
      success: true,
      data: {
        totalRows: result.clients.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        validRows,
        invalidRows,
        errorSummary,
        hasIncomes: result.hasIncomes,
        incomesCount: result.incomes.length,
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al procesar archivo' },
      { status: 500 }
    )
  }
}
