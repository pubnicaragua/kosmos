import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
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

    const moduleAccess = await getModuleAccess(decoded.userId, opportunity.companyId, 'pipeline-ventas')
    if (!moduleAccess.canEdit) return apiError('No tienes permisos para editar oportunidades', 403)

    const baseData: any = {
      title: body.title,
      client: body.client,
      value: typeof body.value === 'number' ? body.value : undefined,
      stage: body.stage,
      status: body.status,
      assignedTo: body.assignedTo,
      assignedUsers: body.assignedUsers,
      currency: body.currency,
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

    // Notificar si se cambiaron los asignados (solo a los nuevos)
    if (body.assignedUsers) {
      try {
        const prevUsers = new Set(JSON.parse(opportunity.assignedUsers || '[]') as string[])
        const newUsers = JSON.parse(body.assignedUsers) as string[]
        
        for (const userId of newUsers) {
          if (!prevUsers.has(userId) && userId !== decoded.userId) {
            await notifyAssignment({
              assignedUserId: userId,
              assignedByUserId: decoded.userId,
              itemType: 'opportunity',
              itemTitle: body.title || opportunity.title,
              itemId: params.id,
            })
          }
        }
      } catch (err) {
        console.error('Error in multi-assignment notification:', err)
      }
    }

    return apiSuccess(updated)
  } catch (error: any) {
    console.error('Error updating opportunity:', error)
    
    // Mensajes de error específicos
    if (error?.code === 'P2002') {
      return apiError('No se pudo actualizar porque el registro no existe o ya fue modificado', 400)
    }
    if (error?.code === 'P2013') {
      return apiError('Faltan campos requeridos para actualizar la oportunidad', 400)
    }
    if (error?.code === 'P2021') {
      return apiError('La tabla de oportunidades no está disponible en la base de datos', 503)
    }
    if (error?.name === 'PrismaClientInitializationError') {
      return apiError('Error de conexión con la base de datos. Intenta de nuevo.', 503)
    }
    if (error?.message?.includes('foreign key')) {
      return apiError('El cliente o usuario asignado no existe en el sistema', 400)
    }
    if (error?.message?.includes('unique constraint')) {
      return apiError('Ya existe una oportunidad con esos datos', 400)
    }
    if (error?.message?.includes('not null')) {
      return apiError('Faltan datos requeridos: nombre del campo obligatorio', 400)
    }
    
    return apiError('Error al actualizar oportunidad. Intenta de nuevo.', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
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

    const moduleAccess = await getModuleAccess(decoded.userId, opportunity.companyId, 'pipeline-ventas')
    if (!moduleAccess.canDelete) return apiError('No tienes permisos para eliminar oportunidades', 403)

    await prisma.opportunity.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Oportunidad eliminada' })
  } catch (error: any) {
    console.error('Error deleting opportunity:', error)
    
    if (error?.code === 'P2023') {
      return apiError('No se puede eliminar esta oportunidad porque tiene datos relacionados', 409)
    }
    if (error?.code === 'P2002') {
      return apiError('El registro que intentas eliminar no existe', 404)
    }
    if (error?.message?.includes('foreign key')) {
      return apiError('No se puede eliminar porque está relacionada con otros datos', 409)
    }
    
    return apiError('Error al eliminar oportunidad. Intenta de nuevo.', 500)
  }
}
