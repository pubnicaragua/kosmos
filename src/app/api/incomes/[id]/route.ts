import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

async function authorizeRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: errorResponse('Token de autenticacion requerido', 401), payload: null }
  }

  const token = authHeader.substring(7)
  const payload = verifyAccessToken(token)
  if (!payload) {
    return { error: errorResponse('Token invalido o expirado', 401), payload: null }
  }

  return { error: null, payload }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authorizeRequest(request)
    if (auth.error || !auth.payload) return auth.error

    const income = await prisma.income.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true } },
      },
    })

    if (!income) {
      return errorResponse('Ingreso no encontrado', 404)
    }

    const access = await getCompanyAccess(auth.payload.userId, income.companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.refNumber !== undefined) updateData.refNumber = String(body.refNumber || '')
    if (body.client !== undefined) updateData.client = String(body.client || '')
    if (body.concept !== undefined) updateData.concept = String(body.concept || '')
    if (body.method !== undefined) updateData.method = String(body.method || '')
    if (body.amount !== undefined) updateData.amount = Number(body.amount) || 0
    if (body.margin !== undefined) updateData.margin = Number(body.margin) || 0
    if (body.status !== undefined) updateData.status = String(body.status)
    if (body.date !== undefined) updateData.date = new Date(body.date)

    const updatedIncome = await prisma.income.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { name: true } },
      },
    })

    return successResponse({
      id: updatedIncome.id,
      company: updatedIncome.company.name,
      companyId: updatedIncome.companyId,
      refNumber: updatedIncome.refNumber,
      client: updatedIncome.client,
      concept: updatedIncome.concept,
      method: updatedIncome.method,
      amount: updatedIncome.amount,
      margin: updatedIncome.margin,
      status: updatedIncome.status,
      date: updatedIncome.date,
    })
  } catch (error) {
    console.error('Update income error:', error)
    return errorResponse('Error al actualizar ingreso', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authorizeRequest(request)
    if (auth.error || !auth.payload) return auth.error

    const income = await prisma.income.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true },
    })

    if (!income) {
      return errorResponse('Ingreso no encontrado', 404)
    }

    const access = await getCompanyAccess(auth.payload.userId, income.companyId)
    if (!access.canAccess) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    await prisma.income.delete({ where: { id: params.id } })
    return successResponse({ message: 'Ingreso eliminado correctamente' })
  } catch (error) {
    console.error('Delete income error:', error)
    return errorResponse('Error al eliminar ingreso', 500)
  }
}
