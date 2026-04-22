import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { expenseIds, updates } = body

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return apiError('expenseIds es requerido y debe ser un array', 400)
    }

    if (!updates || Object.keys(updates).length === 0) {
      return apiError('updates es requerido', 400)
    }

    // Verificar acceso a todas las empresas de los gastos
    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds } },
      select: { id: true, companyId: true },
    })

    const companyIds = [...new Set(expenses.map(e => e.companyId))]
    for (const companyId of companyIds) {
      const access = await getCompanyAccess(decoded.userId, companyId)
      if (!access.canAccess) {
        return apiError('No tienes acceso a una o más empresas', 403)
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    if (updates.status) updateData.status = updates.status
    if (updates.category) updateData.category = updates.category
    if (updates.method) updateData.method = updates.method

    // Actualizar en masa
    const result = await prisma.expense.updateMany({
      where: { id: { in: expenseIds } },
      data: updateData,
    })

    return apiSuccess({
      message: `${result.count} gastos actualizados exitosamente`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error bulk updating expenses:', error)
    return apiError('Error al actualizar gastos en masa', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { expenseIds } = body

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return apiError('expenseIds es requerido y debe ser un array', 400)
    }

    // Verificar acceso a todas las empresas de los gastos
    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds } },
      select: { id: true, companyId: true },
    })

    const companyIds = [...new Set(expenses.map(e => e.companyId))]
    for (const companyId of companyIds) {
      const access = await getCompanyAccess(decoded.userId, companyId)
      if (!access.canAccess) {
        return apiError('No tienes acceso a una o más empresas', 403)
      }
    }

    // Eliminar en masa
    const result = await prisma.expense.deleteMany({
      where: { id: { in: expenseIds } },
    })

    return apiSuccess({
      message: `${result.count} gastos eliminados exitosamente`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error bulk deleting expenses:', error)
    return apiError('Error al eliminar gastos en masa', 500)
  }
}
