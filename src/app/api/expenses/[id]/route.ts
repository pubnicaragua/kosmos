import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const body = await request.json()
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    })

    if (!expense) {
      return apiError('Gasto no encontrado', 404)
    }

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: expense.companyId,
      },
    })

    if (!userCompany) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating expense:', error)
    return apiError('Error al actualizar gasto', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    })

    if (!expense) {
      return apiError('Gasto no encontrado', 404)
    }

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: expense.companyId,
      },
    })

    if (!userCompany) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    await prisma.expense.delete({
      where: { id: params.id },
    })

    return apiSuccess({ message: 'Gasto eliminado' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return apiError('Error al eliminar gasto', 500)
  }
}
