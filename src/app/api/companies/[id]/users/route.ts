import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    let members: any[] = []
    try {
      members = await prisma.userCompany.findMany({
        where: { companyId: params.id, endedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          customRole: { include: { permissions: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    } catch (err: any) {
      // Fallback if custom_roles table doesn't exist yet
      if (err?.code === 'P2021' || err?.message?.includes('custom_roles') || err?.message?.includes('does not exist')) {
        members = await prisma.userCompany.findMany({
          where: { companyId: params.id, endedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
        members = members.map((m) => ({ ...m, customRole: null }))
      } else {
        throw err
      }
    }

    return apiSuccess(members)
  } catch (error: any) {
    console.error('Error fetching company users:', error?.message)
    return apiError('Error al obtener usuarios', 500)
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden agregar usuarios', 403)

    const body = await request.json()
    const { email, role, customRoleId, name, password } = body

    if (!email) return apiError('email es requerido', 400)

    const normalizedEmail = String(email).trim().toLowerCase()
    const requestedName = typeof name === 'string' ? name.trim() : ''
    if (!normalizedEmail) return apiError('email es requerido', 400)

    let targetUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    })
    let generatedPassword: string | null = null

    if (targetUser && requestedName && requestedName !== targetUser.name.trim()) {
      return apiError(
        `El correo ya pertenece a ${targetUser.name}. No se cambió el nombre del perfil existente.`,
        409
      )
    }
    
    if (!targetUser) {
      const { hashPassword } = await import('@/lib/auth')
      
      // Usar contraseña proporcionada o generar una automática
      if (password && password.length >= 6) {
        generatedPassword = password
      } else {
        // Generar contraseña segura: 12 caracteres con mayúsculas, minúsculas, números y símbolos
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
        const symbols = '!@#$%&*'
        generatedPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
          + symbols[Math.floor(Math.random() * symbols.length)]
          + Math.floor(Math.random() * 10)
      }
      
      targetUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: requestedName || normalizedEmail.split('@')[0],
          password: await hashPassword(generatedPassword!),
        },
      })
      
      console.log(`Usuario creado: ${email}`)
    }

    const existing = await prisma.userCompany.findFirst({
      where: { userId: targetUser.id, companyId: params.id },
    })
    if (existing && !existing.endedAt) return apiError('El usuario ya pertenece a esta empresa', 409)

    const memberData = {
      role: role || 'USER',
      customRoleId: customRoleId || null,
      endedAt: null,
    }
    const newMember = existing
      ? await prisma.userCompany.update({
          where: { id: existing.id },
          data: memberData,
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            customRole: { include: { permissions: true } },
          },
        })
      : await prisma.userCompany.create({
          data: {
            userId: targetUser.id,
            companyId: params.id,
            ...memberData,
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            customRole: { include: { permissions: true } },
          },
        })

    // Incluir contraseña generada si es usuario nuevo
    const response = {
      ...newMember,
      generatedPassword: generatedPassword || undefined,
      isNewUser: Boolean(generatedPassword),
    }
    return apiSuccess(response, undefined, 201)
  } catch (error: any) {
    console.error('Error adding user to company:', error?.message)
    return apiError('Error al agregar usuario', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden remover usuarios', 403)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return apiError('userId requerido', 400)

    if (userId === decoded.userId) return apiError('No puedes removerte a ti mismo', 400)

    const targetMembership = await prisma.userCompany.findFirst({
      where: { userId, companyId: params.id, endedAt: null },
      select: { id: true, role: true },
    })
    if (!targetMembership) return apiError('La membresía no existe o ya fue cerrada', 404)

    if (targetMembership.role === 'SUPER_ADMIN' && access.effectiveRole !== 'SUPER_ADMIN') {
      return apiError('Solo SUPER_ADMIN puede remover otra membresía SUPER_ADMIN', 403)
    }

    if (targetMembership.role === 'SUPER_ADMIN') {
      const otherSuperAdmins = await prisma.userCompany.count({
        where: {
          role: 'SUPER_ADMIN',
          endedAt: null,
          userId: { notIn: [userId] },
        },
      })
      if (otherSuperAdmins === 0) return apiError('No puedes cerrar la última membresía SUPER_ADMIN activa', 409)
    }

    const closedMembership = await prisma.userCompany.updateMany({
      where: { id: targetMembership.id, endedAt: null },
      data: { endedAt: new Date() },
    })
    if (closedMembership.count === 0) return apiError('La membresía no existe o ya fue cerrada', 404)

    return apiSuccess({ message: 'Membresía cerrada; el perfil global y sus datos se conservaron' })
  } catch (error: any) {
    console.error('Error removing user:', error?.message)
    return apiError('Error al remover usuario', 500)
  }
}
