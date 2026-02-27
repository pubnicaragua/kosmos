import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    // findUnique sin seleccionar columnas opcionales que pueden no existir
    let opportunity: any
    try {
      opportunity = await prisma.opportunity.findUnique({ where: { id: params.id } })
    } catch (e: any) {
      if (e?.code === 'P2022') {
        opportunity = await (prisma.$queryRaw`
          SELECT id, company_id as "companyId", title, client, value, stage, status, assigned_to as "assignedTo", close_date as "closeDate"
          FROM opportunities WHERE id = ${params.id} LIMIT 1
        ` as Promise<any[]>).then(rows => rows[0] || null)
      } else throw e
    }
    if (!opportunity) return apiError('Oportunidad no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, opportunity.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const baseData: any = {
      title: body.title,
      client: body.client,
      value: typeof body.value === 'number' ? body.value : undefined,
      stage: body.stage,
      status: body.status,
      assignedTo: body.assignedTo,
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
    }

    let updated: any
    try {
      updated = await prisma.opportunity.update({
        where: { id: params.id },
        data: {
          ...baseData,
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        },
      })
    } catch (e: any) {
      if (e?.code === 'P2022') {
        // columnas opcionales no existen todavía - guardar solo campos base
        updated = await prisma.opportunity.update({ where: { id: params.id }, data: baseData })
      } else throw e
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return apiError('Error al actualizar oportunidad', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    let opportunity: any
    try {
      opportunity = await prisma.opportunity.findUnique({ where: { id: params.id } })
    } catch (e: any) {
      if (e?.code === 'P2022') {
        opportunity = await (prisma.$queryRaw`
          SELECT id, company_id as "companyId" FROM opportunities WHERE id = ${params.id} LIMIT 1
        ` as Promise<any[]>).then(rows => rows[0] || null)
      } else throw e
    }
    if (!opportunity) return apiError('Oportunidad no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, opportunity.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.opportunity.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Oportunidad eliminada' })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return apiError('Error al eliminar oportunidad', 500)
  }
}
