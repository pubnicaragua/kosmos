import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

function getContractStatus(endDate: Date): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' {
  const today = new Date()
  const end = new Date(endDate)

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  if (endStart < todayStart) return 'EXPIRED'

  const diffTime = endStart.getTime() - todayStart.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 30 ? 'EXPIRING_SOON' : 'ACTIVE'
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const contract = await prisma.contract.findUnique({ where: { id: params.id } })
    if (!contract) return apiError('Contrato no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, contract.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, contract.companyId, 'contratos')
    if (!moduleAccess.canEdit) return apiError('No tienes permisos para editar contratos', 403)

    const updated = await prisma.contract.update({
      where: { id: params.id },
      data: {
        contractId: body.contractId,
        name: body.name,
        concept: body.concept,
        category: body.category,
        party: body.party,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        fileUrl: body.fileUrl,
        status: getContractStatus(body.endDate ? new Date(body.endDate) : contract.endDate),
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating contract:', error)
    return apiError('Error al actualizar contrato', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const contract = await prisma.contract.findUnique({ where: { id: params.id } })
    if (!contract) return apiError('Contrato no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, contract.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, contract.companyId, 'contratos')
    if (!moduleAccess.canDelete) return apiError('No tienes permisos para eliminar contratos', 403)

    await prisma.contract.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Contrato eliminado' })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return apiError('Error al eliminar contrato', 500)
  }
}
