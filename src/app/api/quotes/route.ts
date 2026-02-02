import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { quoteSchema } from '@/lib/validations'

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

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: { select: { name: true, email: true, phone: true } },
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

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0

    const itemsData = validatedData.items.map((item) => {
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

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: validatedData.quoteNumber,
        companyId: validatedData.companyId,
        clientId: validatedData.clientId,
        currency: validatedData.currency,
        paymentMethod: validatedData.paymentMethod,
        taxApplies: validatedData.taxApplies,
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        total,
        validUntil: new Date(validatedData.validUntil),
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

    return apiSuccess(quote, undefined, 201)
  } catch (error) {
    console.error('Error creating quote:', error)
    return apiError('Error al crear cotización', 500)
  }
}
