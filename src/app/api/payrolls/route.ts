import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return errorResponse('companyId es requerido', 400)
    }

    const payrolls = await prisma.payroll.findMany({
      where: { companyId },
      include: {
        expense: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(payrolls)
  } catch (error) {
    console.error('Get payrolls error:', error)
    return errorResponse('Error al obtener planillas', 500)
  }
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

    const body = await request.json()
    const { companyId, period, fileName, fileUrl, totalAmount, notes, createExpense } = body

    if (!companyId || !period || !fileName || !fileUrl || totalAmount === undefined) {
      return errorResponse('Faltan campos requeridos', 400)
    }

    let expenseId = null

    // Si se solicita crear gasto automáticamente
    if (createExpense) {
      const expense = await prisma.expense.create({
        data: {
          companyId,
          provider: 'Planilla de Nómina',
          concept: `Planilla ${period}`,
          category: 'Nómina',
          method: 'Transferencia',
          amount: totalAmount,
          status: 'PENDING',
          date: new Date(),
          refNumber: `PAYROLL-${Date.now()}`,
        },
      })
      expenseId = expense.id
    }

    const payroll = await prisma.payroll.create({
      data: {
        companyId,
        period,
        fileName,
        fileUrl,
        totalAmount,
        notes,
        expenseId,
        createdBy: payload.userId,
      },
      include: {
        expense: true,
      },
    })

    return successResponse(payroll)
  } catch (error) {
    console.error('Create payroll error:', error)
    return errorResponse('Error al crear planilla', 500)
  }
}
