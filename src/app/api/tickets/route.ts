import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { ticketSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'
import { notifyAssignment } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId || { in: companyIds }
    if (status) where.status = status
    
    // Búsqueda general por título o descripción
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (startDateParam || endDateParam) {
      where.createdAt = {}
      if (startDateParam) {
        const startDate = new Date(startDateParam)
        startDate.setHours(0, 0, 0, 0)
        where.createdAt.gte = startDate
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return apiError('Error al obtener tickets', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const normalizedBody = {
      ...body,
      description: body.description ?? undefined,
      clientId: body.clientId ?? undefined,
      type: body.type ?? undefined,
      assignedTo: body.assignedTo ?? undefined,
      assignedUsers: body.assignedUsers ?? undefined,
      branch: body.branch ?? undefined,
      amount: body.amount ?? undefined,
      currency: body.currency ?? 'USD',
      startDate: body.startDate ?? undefined,
      dueDate: body.dueDate ?? undefined,
      attachments: body.attachments ?? undefined,
      equipmentType: body.equipmentType ?? undefined,
      equipmentBrand: body.equipmentBrand ?? undefined,
      equipmentModel: body.equipmentModel ?? undefined,
      serialNumber: body.serialNumber ?? undefined,
      installationDate: body.installationDate ?? undefined,
      installedBy: body.installedBy ?? undefined,
      evidence: body.evidence ?? undefined,
    }
    const parsed = ticketSchema.safeParse(normalizedBody)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Datos inválidos para el ticket', 400)
    }
    const validatedData = parsed.data

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    // Generar número de ticket único
    const lastTicket = await prisma.ticket.findFirst({
      where: { companyId: validatedData.companyId },
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true }
    })
    
    let ticketNumber = 'TKT-000001'
    if (lastTicket?.ticketNumber) {
      const lastNumber = parseInt(lastTicket.ticketNumber.split('-')[1] || '0')
      ticketNumber = `TKT-${String(lastNumber + 1).padStart(6, '0')}`
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        companyId: validatedData.companyId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        status: validatedData.status,
        priority: validatedData.priority,
        clientId: validatedData.clientId,
        assignedTo: validatedData.assignedTo,
        assignedUsers: body.assignedUsers ? JSON.stringify(body.assignedUsers) : null,
        branch: validatedData.branch,
        amount: validatedData.amount,
        currency: validatedData.currency || 'USD',
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        attachments: body.attachments ? JSON.stringify(body.attachments) : null,
        equipmentType: validatedData.equipmentType,
        equipmentBrand: validatedData.equipmentBrand,
        equipmentModel: validatedData.equipmentModel,
        serialNumber: validatedData.serialNumber,
        installationDate: validatedData.installationDate ? new Date(validatedData.installationDate) : null,
        installedBy: validatedData.installedBy,
        evidence: body.evidence ? JSON.stringify(body.evidence) : null,
        createdBy: decoded.userId,
      },
      include: {
        client: { select: { name: true } },
      },
    })

    // Notify ALL assigned users (preferring assignedUsers IDs)
    const assignedUserIds = body.assignedUsers || []
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      for (const assignedUserId of assignedUserIds) {
        await notifyAssignment({
          assignedUserId,
          assignedByUserId: decoded.userId,
          itemType: 'ticket',
          itemTitle: validatedData.title,
          itemId: ticket.id,
        })
      }
    } else if (validatedData.assignedTo) {
      // Fallback for names
      const assignees = validatedData.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const name of assignees) {
        const userRecord = await prisma.user.findFirst({ where: { name }, select: { id: true } })
        if (userRecord) {
          await notifyAssignment({
            assignedUserId: userRecord.id,
            assignedByUserId: decoded.userId,
            itemType: 'ticket',
            itemTitle: validatedData.title,
            itemId: ticket.id,
          })
        }
      }
    }

    return apiSuccess(ticket, undefined, 201)
  } catch (error: any) {
    console.error('Error creating ticket:', error)
    
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`No se pudo crear el ticket porque: ${issues}`, 400)
    }
    if (error?.code === 'P2002') {
      return apiError('Ya existe un ticket con ese número', 400)
    }
    if (error?.code === 'P2021') {
      return apiError('La tabla de tickets no está disponible', 503)
    }
    if (error?.code === 'P2000') {
      return apiError('El valor de un campo excede el límite permitido', 400)
    }
    if (error?.message?.includes('foreign key')) {
      const errMsg = error.message.toLowerCase()
      if (errMsg.includes('client')) {
        return apiError('El cliente seleccionado no existe', 400)
      }
      if (errMsg.includes('company')) {
        return apiError('La empresa no existe o no tienes acceso', 400)
      }
      return apiError('El registro relacionado no existe', 400)
    }
    if (error?.message?.includes('not null')) {
      return apiError('Faltan datos requeridos para crear el ticket', 400)
    }
    
    return apiError('Error al crear ticket. Verifica los datos e intenta de nuevo.', 500)
  }
}
