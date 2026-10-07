import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

function getPayrollModel() {
  const payrollModel = (prisma as any).payroll
  if (!payrollModel) {
    throw new Error('Payroll model no disponible en Prisma Client. Ejecuta prisma generate.')
  }
  return payrollModel
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const body = await request.json()
    const { status, notes } = body

    const payrollModel = getPayrollModel()
    const existingPayroll = await payrollModel.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true },
    })

    if (!existingPayroll) {
      return errorResponse('Planilla no encontrada', 404)
    }

    const access = await getCompanyAccess(payload.userId, existingPayroll.companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const payroll = await payrollModel.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        expense: true,
      },
    })

    return successResponse(payroll)
  } catch (error) {
    console.error('Update payroll error:', error)
    return errorResponse('Error al actualizar planilla', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const payrollModel = getPayrollModel()
    const existingPayroll = await payrollModel.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true },
    })

    if (!existingPayroll) {
      return errorResponse('Planilla no encontrada', 404)
    }

    const access = await getCompanyAccess(payload.userId, existingPayroll.companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    await payrollModel.delete({
      where: { id: params.id },
    })

    return successResponse({ message: 'Planilla eliminada' })
  } catch (error) {
    console.error('Delete payroll error:', error)
    return errorResponse('Error al eliminar planilla', 500)
  }
}
