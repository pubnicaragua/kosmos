import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const members = await prisma.ticketMember.findMany({
      where: { ticketId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return apiSuccess(members)
  } catch (error: any) {
    console.error('Error fetching ticket members:', error)
    return apiError('Error al obtener miembros', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { userId, role = 'member' } = body

    if (!userId) {
      return apiError('El ID del usuario es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    // Verificar que el usuario a agregar tenga acceso a la empresa
    const userAccess = await getCompanyAccess(userId, ticket.companyId)
    if (!userAccess.canAccess) {
      return apiError('El usuario no tiene acceso a esta empresa', 400)
    }

    const member = await prisma.ticketMember.create({
      data: {
        ticketId: params.id,
        userId,
        role,
        addedBy: decoded.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // Crear log de auditoría
    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'member_added',
        newValue: userId,
        metadata: JSON.stringify({ role }),
      },
    })

    return apiSuccess(member, undefined, 201)
  } catch (error: any) {
    console.error('Error adding ticket member:', error)
    if (error.code === 'P2002') {
      return apiError('El usuario ya es miembro de este ticket', 400)
    }
    return apiError('Error al agregar miembro', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return apiError('El ID del usuario es requerido', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) return apiError('Ticket no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, ticket.companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    await prisma.ticketMember.delete({
      where: {
        ticketId_userId: {
          ticketId: params.id,
          userId,
        },
      },
    })

    // Crear log de auditoría
    await prisma.ticketAuditLog.create({
      data: {
        ticketId: params.id,
        userId: decoded.userId,
        action: 'member_removed',
        oldValue: userId,
      },
    })

    return apiSuccess({ message: 'Miembro eliminado' })
  } catch (error: any) {
    console.error('Error removing ticket member:', error)
    return apiError('Error al eliminar miembro', 500)
  }
}
