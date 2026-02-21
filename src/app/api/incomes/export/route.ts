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
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: payload.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc) => uc.companyId)

    if (companyId && !companyIds.includes(companyId)) {
      return errorResponse('No tienes acceso a esta empresa', 403)
    }

    const whereClause: any = {
      companyId: companyId ? companyId : { in: companyIds },
    }

    if (status) {
      whereClause.status = status
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    const incomes = await prisma.income.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const data = incomes.map((income) => ({
      Empresa: income.company.name,
      Fecha: income.date.toISOString().split('T')[0],
      Referencia: income.refNumber,
      Cliente: income.client,
      Concepto: income.concept,
      Metodo: income.method,
      Monto: income.amount,
      Margen: income.margin,
      Estado: income.status,
    }))

    return successResponse({
      data,
      filename: `ingresos_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Export incomes error:', error)
    return errorResponse('Error al exportar ingresos', 500)
  }
}
