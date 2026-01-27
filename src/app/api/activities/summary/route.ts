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

    const [meetings, calls, quotes, others] = await Promise.all([
      prisma.activity.count({
        where: { ...where, type: 'MEETING' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'CALL' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'QUOTE' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'OTHER' },
      }),
    ])

    const [meetingsPending, callsPending, quotesPending, othersPending] = await Promise.all([
      prisma.activity.count({
        where: { ...where, type: 'MEETING', status: 'PENDING' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'CALL', status: 'PENDING' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'QUOTE', status: 'PENDING' },
      }),
      prisma.activity.count({
        where: { ...where, type: 'OTHER', status: 'PENDING' },
      }),
    ])

    return apiSuccess({
      meetings: {
        total: meetings,
        pending: meetingsPending,
        completed: meetings - meetingsPending,
      },
      calls: {
        total: calls,
        pending: callsPending,
        completed: calls - callsPending,
      },
      quotes: {
        total: quotes,
        pending: quotesPending,
        completed: quotes - quotesPending,
      },
      others: {
        total: others,
        pending: othersPending,
        completed: others - othersPending,
      },
    })
  } catch (error) {
    console.error('Error fetching activities summary:', error)
    return apiError('Error al obtener resumen de actividades', 500)
  }
}
