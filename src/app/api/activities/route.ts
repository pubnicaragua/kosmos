import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {
      companyId: companyId || { in: companyIds },
    }

    if (type) where.type = type
    if (status) where.status = status

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          company: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
    ])

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
      meetingLink: activity.meetingLink,
      completedAt: activity.completedAt?.toISOString(),
    }))

    return apiSuccess({
      data: formattedActivities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
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

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const activity = await prisma.activity.create({
      data: {
        ...activityData,
        companyId,
        dueDate: new Date(activityData.dueDate),
      },
    })

    return apiSuccess(activity, undefined, 201)
  } catch (error) {
    console.error('Error creating activity:', error)
    return apiError('Error al crear actividad', 500)
  }
}
