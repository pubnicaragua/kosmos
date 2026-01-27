import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)

    const where: any = {
      companyId: companyId || { in: companyIds },
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const csvData = expenses.map((exp: any) => ({
      Empresa: exp.company.name,
      Fecha: exp.date.toISOString().split('T')[0],
      Referencia: exp.refNumber || '',
      Proveedor: exp.provider,
      Concepto: exp.concept,
      Categoría: exp.category,
      Método: exp.method,
      Monto: exp.amount,
      Estado: exp.status,
    }))

    return apiSuccess({
      data: csvData,
      filename: `gastos_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Error exporting expenses:', error)
    return apiError('Error al exportar gastos', 500)
  }
}
