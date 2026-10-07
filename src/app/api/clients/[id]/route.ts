import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { checkDbDuplicateCedulaRuc } from '@/lib/client-validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
      },
    })
    if (!client) return apiError('Cliente no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, client.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return apiError('Error al obtener cliente', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return apiError('Cliente no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, client.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, client.companyId, 'clientes')
    if (!moduleAccess.canEdit) return apiError('No tienes permisos para editar clientes', 403)

    const dupErrors = await checkDbDuplicateCedulaRuc(client.companyId, {
      cedula: body.cedula,
      ruc: body.ruc,
    }, params.id)
    if (dupErrors.length > 0) {
      return apiError(dupErrors.map(e => e.message).join('. '), 409)
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        ruc: body.ruc,
        cedula: body.cedula,
        contactName: body.contactName,
        status: body.status,
      },
      include: { company: { select: { name: true } } },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating client:', error)
    return apiError('Error al actualizar cliente', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return apiError('Cliente no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, client.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, client.companyId, 'clientes')
    if (!moduleAccess.canDelete) return apiError('No tienes permisos para eliminar clientes', 403)

    // Soft delete - set status to INACTIVO instead of hard delete
    await prisma.client.update({ 
      where: { id: params.id },
      data: { status: 'INACTIVO' }
    })
    return apiSuccess({ message: 'Cliente marcado como inactivo' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return apiError('Error al eliminar cliente', 500)
  }
}
