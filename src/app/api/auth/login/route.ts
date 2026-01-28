import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`🔐 [LOGIN-API-${requestId}] Nueva solicitud de login recibida`)
  
  try {
    const body = await request.json()
    console.log(`📧 [LOGIN-API-${requestId}] Email solicitado:`, body.email)
    
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      console.error(`❌ [LOGIN-API-${requestId}] Validación fallida:`, validation.error.errors)
      return errorResponse(validation.error.errors[0].message, 400)
    }

    const { email, password } = validation.data
    console.log(`🔍 [LOGIN-API-${requestId}] Buscando usuario en BD...`)

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
      console.warn(`⚠️ [LOGIN-API-${requestId}] Usuario no encontrado:`, email)
      return errorResponse('Email o contraseña incorrectos', 401)
    }

    console.log(`👤 [LOGIN-API-${requestId}] Usuario encontrado:`, user.name)
    console.log(`🔑 [LOGIN-API-${requestId}] Verificando contraseña...`)

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      console.warn(`⚠️ [LOGIN-API-${requestId}] Contraseña incorrecta para:`, email)
      return errorResponse('Email o contraseña incorrectos', 401)
    }

    console.log(`✅ [LOGIN-API-${requestId}] Contraseña válida`)
    console.log(`🎫 [LOGIN-API-${requestId}] Generando tokens...`)

    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email })

    console.log(`💾 [LOGIN-API-${requestId}] Guardando refresh token en BD...`)
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

    console.log(`🏢 [LOGIN-API-${requestId}] Empresas del usuario:`, companies.length)
    console.log(`📋 [LOGIN-API-${requestId}] Roles:`, companies.map(c => `${c.name}: ${c.role}`))
    console.log(`✅ [LOGIN-API-${requestId}] Login exitoso para:`, user.email)

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
    console.error(`🚨 [LOGIN-API-${requestId}] Error crítico:`, error)
    console.error(`📍 [LOGIN-API-${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack available')
    return errorResponse('Error al iniciar sesión', 500)
  }
}
