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

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const opportunities = await prisma.opportunity.findMany({
      where: {
        companyId: companyId || { in: companyIds },
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = opportunities.map((opportunity) => ({
      Empresa: opportunity.company.name,
      Titulo: opportunity.title,
      Cliente: opportunity.client,
      Valor: opportunity.value,
      Etapa: opportunity.stage,
      Estado: opportunity.status,
      AsignadoA: opportunity.assignedTo || '',
      FechaCierre: opportunity.closeDate ? opportunity.closeDate.toISOString().split('T')[0] : '',
    }))

    return apiSuccess({
      data,
      filename: `pipeline_ventas_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Error exporting opportunities:', error)
    return apiError('Error al exportar oportunidades', 500)
  }
}
