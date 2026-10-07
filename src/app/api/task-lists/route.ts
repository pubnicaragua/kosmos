import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const area = searchParams.get('area')

    if (!companyId) return apiError('companyId requerido', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const where: any = { companyId }
    if (area) where.area = area

    const taskLists = await prisma.taskList.findMany({
      where,
      include: {
        templates: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            assignments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(taskLists)
  } catch (error) {
    console.error('Error fetching task lists:', error)
    return apiError('Error al obtener listas de tareas', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, name, description, area, frequency, requireEvidence, templates } = body

    if (!companyId || !name) {
      return apiError('companyId y name son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const taskList = await prisma.taskList.create({
      data: {
        companyId,
        name,
        description,
        area,
        frequency: frequency || 'DAILY',
        requireEvidence: requireEvidence || false,
        createdBy: decoded.userId,
        templates: templates?.length ? {
          create: templates.map((t: any, idx: number) => ({
            title: t.title,
            description: t.description,
            order: idx,
            requirePhoto: t.requirePhoto || false,
            requireVideo: t.requireVideo || false,
            estimatedMinutes: t.estimatedMinutes
          }))
        } : undefined
      },
      include: {
        templates: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return apiSuccess(taskList, undefined, 201)
  } catch (error: any) {
    console.error('Error creating task list:', error)
    return apiError('Error al crear lista de tareas', 500)
  }
}
