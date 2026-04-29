import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { quoteSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId ? companyId : { in: companyIds }
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        // createdByUser: { select: { name: true } }, // TODO: Add after migration
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return apiError('Error al obtener cotizaciones', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = quoteSchema.parse(body)

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

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
        items: {
          create: itemsData,
        },
      },
      include: {
        client: { select: { name: true } },
        items: true,
      },
    })

    // Notify admins of the company
    try {
      const companyUsers = await prisma.userCompany.findMany({
        where: {
          companyId: validatedData.companyId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
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

    return apiSuccess(quote, undefined, 201)
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
