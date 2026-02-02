import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { z } from 'zod'

const marketingSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  channel: z.enum(['REDES_SOCIALES', 'EMAIL', 'PUBLICIDAD_DIGITAL', 'CONTENIDO', 'EVENTOS', 'OTRO']),
  status: z.enum(['PLANIFICACION', 'EN_CURSO', 'PAUSADA', 'COMPLETADA', 'CANCELADA']).optional(),
  budget: z.number().optional(),
  spent: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetAudience: z.string().optional(),
  metrics: z.string().optional(),
  assignedTo: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (status) where.status = status
    if (channel) where.channel = channel

    const campaigns = await prisma.marketingCampaign.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(campaigns)
  } catch (error) {
    console.error('Error fetching marketing campaigns:', error)
    return apiError('Error al obtener campañas', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = marketingSchema.parse(body)

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const campaign = await prisma.marketingCampaign.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        channel: validatedData.channel,
        status: validatedData.status || 'PLANIFICACION',
        budget: validatedData.budget || null,
        spent: validatedData.spent || 0,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        targetAudience: validatedData.targetAudience || null,
        metrics: validatedData.metrics || null,
        assignedTo: validatedData.assignedTo || null,
        companyId: validatedData.companyId,
        createdBy: decoded.userId,
      },
      include: {
        company: { select: { name: true } },
      },
    })

    return apiSuccess(campaign, undefined, 201)
  } catch (error) {
    console.error('Error creating marketing campaign:', error)
    return apiError('Error al crear campaña', 500)
  }
}
