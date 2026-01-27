import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', validation.error.errors[0].message, 400)
    }

    const { email, password } = validation.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401)
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401)
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email })

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    })

    const companies = user.userCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
      logo: uc.company.logo,
      isActive: uc.company.isActive,
      role: uc.role,
    }))

    return successResponse({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      companies,
      requiresCompanySelection: companies.length > 1,
    })
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse('SERVER_ERROR', 'Error al iniciar sesión', 500)
  }
}
