import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { quoteSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { resolveHistoricalUserNames } from '@/lib/user-name-history'
import { parseQuotePagination, QUOTE_PIPELINE_STAGES } from '@/lib/quote-pipeline'
import { stripLegacyQuoteDocumentStatus } from '@/lib/quote-public-view'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')?.trim()
    const pipelineStage = searchParams.get('pipelineStage')
    const statusAlias = searchParams.get('status')
    if (pipelineStage && statusAlias && pipelineStage !== statusAlias) {
      return apiError('Usa un solo filtro de etapa', 400)
    }
    const requestedStage = pipelineStage || statusAlias
    let pagination
    try {
      pagination = parseQuotePagination(searchParams.get('page'), searchParams.get('pageSize'))
    } catch (error) {
      return apiError(error instanceof Error ? error.message : 'Paginación inválida', 400)
    }
    if (requestedStage && !QUOTE_PIPELINE_STAGES.includes(requestedStage as (typeof QUOTE_PIPELINE_STAGES)[number])) {
      return apiError('Etapa comercial inválida', 400)
    }

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    const allowedCompanyIds = []
    const canEditByCompany: Record<string, boolean> = {}

    for (const cid of companyIds) {
      const moduleAccess = await getModuleAccess(decoded.userId, cid, 'cotizaciones')
      if (moduleAccess.canView || moduleAccess.canCreate) {
        allowedCompanyIds.push(cid)
        canEditByCompany[cid] = moduleAccess.canEdit
      }
    }

    const where: any = {}

    if (companyId) {
      if (!allowedCompanyIds.includes(companyId)) {
        return apiError('No tienes permisos para ver cotizaciones en esta empresa', 403)
      }
      where.companyId = companyId
    } else {
      if (allowedCompanyIds.length === 0) {
        return apiError('No tienes permisos para ver cotizaciones en ninguna empresa', 403)
      }
      where.companyId = { in: allowedCompanyIds }
    }
    if (clientId) where.clientId = clientId
    if (requestedStage) where.pipelineStage = requestedStage
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const quoteQuery = {
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true } } } },
        stageHistory: {
          orderBy: { changedAt: 'desc' as const },
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    }

    let quotes
    let total = 0
    let groupedStages: Array<{ pipelineStage: (typeof QUOTE_PIPELINE_STAGES)[number]; _count: { _all: number } }> = []

    if (pagination) {
      [quotes, total, groupedStages] = await prisma.$transaction(async (tx) => Promise.all([
        tx.quote.findMany({
          ...quoteQuery,
          skip: pagination.skip,
          take: pagination.pageSize,
        }),
        tx.quote.count({ where }),
        tx.quote.groupBy({
          by: ['pipelineStage'],
          where,
          _count: { _all: true },
        }),
      ]), { isolationLevel: 'RepeatableRead' })
    } else {
      quotes = await prisma.quote.findMany(quoteQuery)
    }

    const creatorNames = await resolveHistoricalUserNames(quotes.map((quote) => ({
      userId: quote.createdBy,
      occurredAt: quote.createdAt,
    })))

    const items = quotes.map((quote, index) => ({
      ...stripLegacyQuoteDocumentStatus(quote),
      createdByUser: quote.createdBy
        ? { name: creatorNames[index] || 'Usuario desconocido' }
        : null,
    }))

    if (!pagination) return apiSuccess(items)

    const stageCounts = Object.fromEntries(QUOTE_PIPELINE_STAGES.map((stage) => [stage, 0]))
    for (const group of groupedStages) {
      stageCounts[group.pipelineStage] = group._count._all
    }

    return apiSuccess({
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
      stageCounts,
      canEditByCompany,
    })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return apiError('Error al obtener cotizaciones', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = quoteSchema.parse(body)

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, validatedData.companyId, 'cotizaciones')
    if (!moduleAccess.canCreate) return apiError('No tienes permisos para crear cotizaciones', 403)

    const creator = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    })
    if (!creator) return apiError('Usuario no encontrado', 401)

    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0

    const itemsData = (validatedData.items || []).map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice
      const itemDiscount = itemSubtotal * ((item.discount || 0) / 100)
      // Solo aplicar IVA si taxApplies es true
      const itemTax = validatedData.taxApplies 
        ? (itemSubtotal - itemDiscount) * ((item.tax || 0) / 100)
        : 0
      const itemTotal = itemSubtotal - itemDiscount + itemTax

      subtotal += itemSubtotal
      totalDiscount += itemDiscount
      totalTax += itemTax

      return {
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total: itemTotal,
      }
    })

    const total = subtotal - totalDiscount + totalTax

    const year = new Date().getFullYear()
    const countResult = await prisma.quote.count({ where: { companyId: validatedData.companyId } })
    const quoteNumber = validatedData.quoteNumber || `COT-${year}-${String(countResult + 1).padStart(6, '0')}`

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        companyId: validatedData.companyId,
        clientId: validatedData.clientId,
        currency: validatedData.currency,
        paymentMethod: validatedData.paymentMethod,
        taxApplies: validatedData.taxApplies,
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        total,
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: validatedData.notes || null,
        internalNotes: validatedData.internalNotes || null,
        terms: validatedData.terms || null,
        createdBy: decoded.userId,
        pipelineStage: 'PROSPECTO',
        items: {
          create: itemsData,
        },
        stageHistory: {
          create: {
            fromStage: null,
            toStage: 'PROSPECTO',
            actorId: decoded.userId,
            actorName: creator.name,
            source: 'USER',
          },
        },
      },
      include: {
        client: { select: { name: true } },
        items: true,
        stageHistory: true,
      },
    })

    // Notify admins of the company
    try {
      const companyUsers = await prisma.userCompany.findMany({
        where: {
          companyId: validatedData.companyId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          endedAt: null,
          user: { is: { isActive: true } },
        }
      })

      for (const cu of companyUsers) {
        if (cu.userId !== decoded.userId) {
          await prisma.notification.create({
            data: {
              userId: cu.userId,
              title: 'Cotización Requiere Aprobación',
              message: `Cotización ${quoteNumber} para ${quote.client.name} requiere tu aprobación`,
              type: 'ASSIGNMENT',
              link: `/clientes/cotizacion/${quote.id}`
            }
          })
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError)
    }

    return apiSuccess(stripLegacyQuoteDocumentStatus(quote), undefined, 201)
  } catch (error: any) {
    console.error('Error creating quote:', error)
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`Datos inválidos: ${issues}`, 400)
    }
    if (error?.code === 'P2002') {
      return apiError('Ya existe una cotización con ese número', 400)
    }
    return apiError(`Error al crear cotización: ${error?.message || error}`, 500)
  }
}
