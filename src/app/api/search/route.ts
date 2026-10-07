import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return apiSuccess({ results: [] })
    }

    const searchTerm = query.trim()

    // Get user's accessible companies
    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId, endedAt: null },
      select: { companyId: true }
    })
    const companyIds = userCompanies.map(uc => uc.companyId)

    // Search in parallel across all modules
    const [clients, opportunities, incomes, expenses, quotes] = await Promise.all([
      // Clientes
      prisma.client.findMany({
        where: {
          companyId: { in: companyIds },
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: { select: { name: true } }
        },
        take: 5
      }),

      // Oportunidades
      prisma.opportunity.findMany({
        where: {
          companyId: { in: companyIds },
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { client: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          client: true,
          value: true,
          stage: true,
          company: { select: { name: true } }
        },
        take: 5
      }),

      // Ingresos
      prisma.income.findMany({
        where: {
          companyId: { in: companyIds },
          OR: [
            { client: { contains: searchTerm, mode: 'insensitive' } },
            { concept: { contains: searchTerm, mode: 'insensitive' } },
            { refNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          client: true,
          concept: true,
          amount: true,
          date: true,
          company: { select: { name: true } }
        },
        take: 5
      }),

      // Gastos
      prisma.expense.findMany({
        where: {
          companyId: { in: companyIds },
          OR: [
            { provider: { contains: searchTerm, mode: 'insensitive' } },
            { concept: { contains: searchTerm, mode: 'insensitive' } },
            { refNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          provider: true,
          concept: true,
          amount: true,
          date: true,
          company: { select: { name: true } }
        },
        take: 5
      }),

      // Cotizaciones
      prisma.quote.findMany({
        where: {
          companyId: { in: companyIds },
          OR: [
            { quoteNumber: { contains: searchTerm, mode: 'insensitive' } },
            { client: { name: { contains: searchTerm, mode: 'insensitive' } } }
          ]
        },
        select: {
          id: true,
          quoteNumber: true,
          client: { select: { name: true } },
          total: true,
          status: true,
          company: { select: { name: true } }
        },
        take: 5
      })
    ])

    const results = {
      clientes: clients.map(c => ({
        id: c.id,
        title: c.name,
        subtitle: c.email || c.phone || '',
        company: c.company.name,
        type: 'cliente',
        link: `/clientes/${c.id}`
      })),
      oportunidades: opportunities.map(o => ({
        id: o.id,
        title: o.title,
        subtitle: `${o.client} - $${o.value.toFixed(2)} - ${o.stage}`,
        company: o.company.name,
        type: 'oportunidad',
        link: `/pipeline-ventas`
      })),
      ingresos: incomes.map(i => ({
        id: i.id,
        title: i.client,
        subtitle: `${i.concept} - $${i.amount.toFixed(2)}`,
        company: i.company.name,
        type: 'ingreso',
        link: `/ingresos`
      })),
      gastos: expenses.map(e => ({
        id: e.id,
        title: e.provider,
        subtitle: `${e.concept} - $${e.amount.toFixed(2)}`,
        company: e.company.name,
        type: 'gasto',
        link: `/gastos`
      })),
      cotizaciones: quotes.map(q => ({
        id: q.id,
        title: q.quoteNumber,
        subtitle: `${q.client.name} - $${q.total.toFixed(2)} - ${q.status}`,
        company: q.company.name,
        type: 'cotizacion',
        link: `/clientes/cotizacion/${q.id}`
      }))
    }

    return apiSuccess({ results })
  } catch (error) {
    console.error('Error in global search:', error)
    return apiError('Error en búsqueda', 500)
  }
}
