import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    // Verificar que el usuario que hace la petición es SUPER_ADMIN
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userCompanies: true,
      },
    })

    if (!requestingUser) {
      return errorResponse('Usuario no encontrado', 404)
    }

    const isSuperAdmin = requestingUser.userCompanies.some(
      (uc) => uc.role === 'SUPER_ADMIN'
    )

    if (!isSuperAdmin) {
      return errorResponse('Solo SUPER_ADMIN puede cambiar contraseñas', 403)
    }

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400)
    }

    // Verificar que el usuario objetivo existe
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    })

    return successResponse({ message: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Update password error:', error)
    return errorResponse('Error al actualizar la contraseña', 500)
  }
}
