import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExcelFileAllSheets } from '@/lib/import-clients'

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
    const importIncomes = formData.get('importIncomes') === 'true'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'No se proporcionó empresa' }, { status: 400 })
    }

    // Verificar que la empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 })
    }

    // Leer archivo
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parsear Excel (procesa todas las hojas)
    const result = parseExcelFileAllSheets(buffer)

    if (result.errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Errores al procesar archivo', 
        details: result.errors 
      }, { status: 400 })
    }

    // Importar clientes
    const importedClients = []
    const skippedClients = []

    for (const clientData of result.clients) {
      try {
        // Verificar si ya existe por nombre
        const existing = await prisma.client.findFirst({
          where: {
            companyId,
            name: clientData.name
          }
        })

        if (existing) {
          skippedClients.push({ name: clientData.name, reason: 'Ya existe' })
          continue
        }

        // Crear cliente
        const client = await prisma.client.create({
          data: {
            companyId,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            phone2: clientData.phone2,
            cedula: clientData.cedula,
            ruc: clientData.ruc,
            alias: clientData.alias,
            codigoInterno: clientData.codigoInterno,
            curso: clientData.curso,
            sucursal: clientData.sucursal,
            contribuyente: clientData.contribuyente,
            telefonoTutor: clientData.telefonoTutor,
            notes: clientData.notes,
            customFields: clientData.customFields,
            status: 'ACTIVO'
          }
        })

        importedClients.push(client)
      } catch (error) {
        console.error('Error importing client:', clientData.name, error)
        skippedClients.push({ name: clientData.name, reason: 'Error al crear' })
      }
    }

    // Importar ingresos si aplica
    const importedIncomes = []
    const skippedIncomes = []

    if (importIncomes && result.hasIncomes && result.incomes.length > 0) {
      for (const incomeData of result.incomes) {
        try {
          // Determinar monto principal y moneda
          let amount = incomeData.importeMonedaFactura || incomeData.importeMonedaCobro || 0
          let currency = incomeData.monedaFactura || incomeData.monedaCobro || 'USD'
          
          // Normalizar moneda
          if (currency === 'COR') currency = 'NIO'
          
          // Crear ingreso
          const income = await prisma.income.create({
            data: {
              companyId,
              refNumber: incomeData.folio || incomeData.documento || `IMP-${Date.now()}`,
              client: incomeData.cliente,
              concept: incomeData.documento || incomeData.origen || 'Importación',
              method: 'Importado',
              amount,
              margin: 0,
              status: 'PAID',
              date: incomeData.fechaEmision || new Date(),
              folio: incomeData.folio,
              documento: incomeData.documento,
              origen: incomeData.origen,
              currency,
              amountSecondary: incomeData.importeMonedaCobro !== incomeData.importeMonedaFactura 
                ? incomeData.importeMonedaCobro 
                : undefined,
              currencySecondary: incomeData.monedaCobro !== incomeData.monedaFactura 
                ? incomeData.monedaCobro 
                : undefined,
              customFields: incomeData.customFields
            }
          })

          importedIncomes.push(income)
        } catch (error) {
          console.error('Error importing income:', incomeData, error)
          skippedIncomes.push({ folio: incomeData.folio, reason: 'Error al crear' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        clients: {
          imported: importedClients.length,
          skipped: skippedClients.length,
          details: skippedClients
        },
        incomes: {
          imported: importedIncomes.length,
          skipped: skippedIncomes.length,
          details: skippedIncomes
        },
        hasIncomes: result.hasIncomes
      }
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al importar datos' },
      { status: 500 }
    )
  }
}
