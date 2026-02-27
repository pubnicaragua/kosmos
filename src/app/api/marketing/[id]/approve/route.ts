import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { action } = body

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return apiError('Acción inválida. Usa APPROVE o REJECT', 400)
    }

    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: params.id },
    })

    if (!campaign) return apiError('Campaña no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, campaign.companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || '')) {
      return apiError('Solo administradores pueden aprobar campañas', 403)
    }

    // Intentar actualizar con campos de aprobación, fallback si no existen
    let updated
    try {
      // Cast para evitar error de tipo si las columnas no están en el schema local
      updated = await prisma.marketingCampaign.update({
        where: { id: params.id },
        data: {
          approvalStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approvedBy: decoded.userId,
          approvedAt: new Date(),
        } as any,
      })
    } catch (err: any) {
      if (err?.code === 'P2022') {
        // Columnas de aprobación no existen - actualizar solo el status
        updated = await prisma.marketingCampaign.update({
          where: { id: params.id },
          data: {
            status: action === 'APPROVE' ? 'ACTIVO' : 'CANCELADO',
          } as any,
        })
      } else {
        throw err
      }
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error approving marketing campaign:', error)
    return apiError('Error al procesar aprobación', 500)
  }
}
