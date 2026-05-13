import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

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
    const assignedToMe = searchParams.get('assignedToMe')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'dueDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
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
    if (assignedToMe) {
      where.assignedTo = { contains: assignedToMe }
    }
    
    // Búsqueda general por título, cliente o descripción
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          company: { select: { name: true } },
        },
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
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
      createdAt: activity.createdAt?.toISOString(),
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

    const moduleAccess = await getModuleAccess(decoded.userId, companyId, 'actividades')
    if (!moduleAccess.canCreate) {
      return apiError('No tienes permisos para crear actividades', 403)
    }

    const activity = await prisma.activity.create({
      data: {
        ...activityData,
        companyId,
        dueDate: activityData.dueDate ? new Date(activityData.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: activityData.type || 'OTHER',
      },
    })

    // Notify each assigned user (supports comma-separated multi-assignee names)
    if (activityData.assignedTo) {
      const assignees = activityData.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const name of assignees) {
        const userRecord = await prisma.user.findFirst({ where: { name }, select: { id: true } })
        if (userRecord) {
          await notifyAssignment({
            assignedUserId: userRecord.id,
            assignedByUserId: decoded.userId,
            itemType: 'activity',
            itemTitle: activityData.title,
            itemId: activity.id,
          })
        }
      }
    }

    return apiSuccess(activity, undefined, 201)
  } catch (error: any) {
    console.error('Error creating activity:', error)
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`Datos inválidos: ${issues}`, 400)
    }
    return apiError(`Error al crear actividad: ${error?.message || error}`, 500)
  }
}
