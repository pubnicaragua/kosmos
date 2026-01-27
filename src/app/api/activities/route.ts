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
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)

    const where: any = {
      companyId: companyId || { in: companyIds },
    }

    if (type) where.type = type
    if (status) where.status = status

    const activities = await prisma.activity.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      company: activity.company.name,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      client: activity.client,
      status: activity.status,
      priority: activity.priority,
      assignedTo: activity.assignedTo,
      dueDate: activity.dueDate.toISOString(),
      completedAt: activity.completedAt?.toISOString(),
    }))

    return apiSuccess(formattedActivities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return apiError('Error al obtener actividades', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return apiError('Token no proporcionado', 401)
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return apiError('Token inválido', 401)
    }

    const body = await request.json()
    const { companyId, ...activityData } = body

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: companyId,
      },
    })

    if (!userCompany) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const activity = await prisma.activity.create({
      data: {
        ...activityData,
        companyId,
        dueDate: new Date(activityData.dueDate),
      },
    })

    return apiSuccess(activity, 201)
  } catch (error) {
    console.error('Error creating activity:', error)
    return apiError('Error al crear actividad', 500)
  }
}
