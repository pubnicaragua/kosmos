import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

function getPayrollModel() {
  const payrollModel = (prisma as any).payroll
  if (!payrollModel) {
    return null
  }
  return payrollModel
}

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

    const access = await getCompanyAccess(payload.userId, companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const payrollModel = getPayrollModel()
    if (!payrollModel) {
      console.warn('Payroll model no disponible; retornando lista vacía')
      return successResponse([])
    }
    
    try {
      const payrolls = await payrollModel.findMany({
        where: { companyId },
        include: {
          expense: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const payrollsArray = Array.isArray(payrolls) ? payrolls : []
      return successResponse(payrollsArray)
    } catch (error) {
      console.error('Get payrolls error:', error)
      return successResponse([])
    }
  } catch (error) {
    console.error('Payrolls GET error:', error)
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

    const access = await getCompanyAccess(payload.userId, companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const normalizedTotalAmount = Number(totalAmount)
    if (!Number.isFinite(normalizedTotalAmount) || normalizedTotalAmount < 0) {
      return errorResponse('Monto total inválido', 400)
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
          amount: normalizedTotalAmount,
          status: 'PENDING',
          date: new Date(),
          refNumber: `PAYROLL-${Date.now()}`,
        },
      })
      expenseId = expense.id
    }

    const payrollModel = getPayrollModel()
    if (!payrollModel) {
      console.warn('Payroll model not available; migration pending')
      return successResponse({ pending: true, message: 'Módulo de planillas pendiente de migración en producción.' })
    }
    const payroll = await payrollModel.create({
      data: {
        companyId,
        period,
        fileName,
        fileUrl,
        totalAmount: normalizedTotalAmount,
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
