import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const templateModule = searchParams.get('module')
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    // If getting single template by ID
    if (id) {
      const template = await prisma.template.findUnique({
        where: { id },
      })
      if (!template) return apiError('Plantilla no encontrada', 404)
      if (!companyIds.includes(template.companyId)) {
        return apiError('No tienes acceso a esta plantilla', 403)
      }
      return apiSuccess(template)
    }

    const where: any = {
      companyId: { in: companyIds },
    }
    if (companyId) where.companyId = companyId
    if (templateModule) where.module = templateModule
    if (type) where.type = type
    where.isActive = true

    const templates = await prisma.template.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return apiSuccess(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return apiError('Error al obtener plantillas', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { name, type, fileUrl, content, module: templateModule, companyId } = body

    if (!name || !type || !templateModule || !companyId) {
      return apiError('Nombre, tipo, módulo y empresa son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const template = await prisma.template.create({
      data: {
        name,
        type,
        fileUrl: fileUrl || null,
        content: content || null,
        module: templateModule,
        companyId,
        createdBy: decoded.userId,
      },
    })

    return apiSuccess(template, undefined, 201)
  } catch (error) {
    console.error('Error creating template:', error)
    return apiError('Error al crear plantilla', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { id, name, type, fileUrl, content, module: templateModule, isActive } = body

    if (!id) return apiError('ID de plantilla requerido', 400)

    const existing = await prisma.template.findUnique({ where: { id } })
    if (!existing) return apiError('Plantilla no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(content !== undefined && { content }),
        ...(templateModule && { module: templateModule }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return apiSuccess(template)
  } catch (error) {
    console.error('Error updating template:', error)
    return apiError('Error al actualizar plantilla', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return apiError('ID de plantilla requerido', 400)

    const existing = await prisma.template.findUnique({ where: { id } })
    if (!existing) return apiError('Plantilla no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.template.delete({ where: { id } })

    return apiSuccess({ message: 'Plantilla eliminada' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return apiError('Error al eliminar plantilla', 500)
  }
}