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

    const activities = await prisma.activity.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const csvData = activities.map((act: any) => ({
      Empresa: act.company.name,
      Tipo: act.type,
      Título: act.title,
      Descripción: act.description || '',
      Cliente: act.client || '',
      Estado: act.status,
      Prioridad: act.priority || '',
      Asignado: act.assignedTo || '',
      'Fecha Vencimiento': act.dueDate.toISOString().split('T')[0],
      'Fecha Completado': act.completedAt ? act.completedAt.toISOString().split('T')[0] : '',
    }))

    return apiSuccess({
      data: csvData,
      filename: `actividades_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Error exporting activities:', error)
    return apiError('Error al exportar actividades', 500)
  }
}
