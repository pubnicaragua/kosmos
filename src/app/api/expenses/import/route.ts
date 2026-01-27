import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

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

    const body = await request.json()
    const { companyId, expenses } = body

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: companyId,
      },
    })

    if (!userCompany) {
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
      count: created.count,
    })
  } catch (error) {
    console.error('Error importing expenses:', error)
    return apiError('Error al importar gastos', 500)
  }
}
