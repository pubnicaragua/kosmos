import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const members = await prisma.userCompany.findMany({
      where: { companyId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        customRole: { include: { permissions: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

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
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden agregar usuarios', 403)

    const body = await request.json()
    const { email, role, customRoleId, name } = body

    if (!email) return apiError('email es requerido', 400)

    // Auto-create user if doesn't exist
    let targetUser = await prisma.user.findUnique({ where: { email } })
    
    if (!targetUser) {
      const { hashPassword } = await import('@/lib/auth')
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!'
      
      targetUser = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: await hashPassword(tempPassword),
        },
      })
      
      console.log(`Usuario creado: ${email} con contraseña temporal: ${tempPassword}`)
    }

    const existing = await prisma.userCompany.findFirst({
      where: { userId: targetUser.id, companyId: params.id },
    })
    if (existing) return apiError('El usuario ya pertenece a esta empresa', 409)

    const member = await prisma.userCompany.create({
      data: {
        userId: targetUser.id,
        companyId: params.id,
        role: role || 'USER',
        customRoleId: customRoleId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        customRole: { include: { permissions: true } },
      },
    })

    return apiSuccess(member, undefined, 201)
  } catch (error: any) {
    console.error('Error adding user to company:', error?.message)
    return apiError('Error al agregar usuario', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const access = await getCompanyAccess(decoded.userId, params.id)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || ''))
      return apiError('Solo admins pueden remover usuarios', 403)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return apiError('userId requerido', 400)

    if (userId === decoded.userId) return apiError('No puedes removerte a ti mismo', 400)

    await prisma.userCompany.delete({
      where: { userId_companyId: { userId, companyId: params.id } },
    })

    return apiSuccess({ message: 'Usuario removido de la empresa' })
  } catch (error: any) {
    console.error('Error removing user:', error?.message)
    return apiError('Error al remover usuario', 500)
  }
}
