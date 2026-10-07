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
    const companyId = searchParams.get('companyId')
    const cedula = searchParams.get('cedula')
    const ruc = searchParams.get('ruc')
    const excludeId = searchParams.get('excludeId')

    if (!companyId) return apiError('companyId requerido', 400)
    if (!cedula && !ruc) return apiError('Debe proporcionar cedula o ruc', 400)

    const conflicts: string[] = []

    if (cedula?.trim()) {
      const existing = await prisma.client.findFirst({
        where: {
          companyId,
          cedula: cedula.trim(),
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { name: true },
      })
      if (existing) {
        conflicts.push(`Cédula ya registrada en cliente "${existing.name}"`)
      }
    }

    if (ruc?.trim()) {
      const existing = await prisma.client.findFirst({
        where: {
          companyId,
          ruc: ruc.trim(),
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { name: true },
      })
      if (existing) {
        conflicts.push(`RUC ya registrado en cliente "${existing.name}"`)
      }
    }

    return apiSuccess({ conflicts })
  } catch (error) {
    console.error('Error checking cedula/ruc:', error)
    return apiError('Error al verificar', 500)
  }
}
