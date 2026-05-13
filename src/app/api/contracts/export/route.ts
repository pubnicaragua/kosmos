import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const contracts = await prisma.contract.findMany({
      where: {
        companyId: companyId || { in: companyIds },
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
    })

    const data = contracts.map((contract) => ({
      Empresa: contract.company.name,
      ContratoId: contract.contractId,
      Nombre: contract.name,
      Concepto: contract.concept,
      Categoria: contract.category || '',
      Contraparte: contract.party,
      FechaInicio: contract.startDate.toISOString().split('T')[0],
      FechaFin: contract.endDate.toISOString().split('T')[0],
      Estado: contract.status,
      Archivo: contract.fileUrl || '',
    }))

    return apiSuccess({
      data,
      filename: `contratos_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Error exporting contracts:', error)
    return apiError('Error al exportar contratos', 500)
  }
}
