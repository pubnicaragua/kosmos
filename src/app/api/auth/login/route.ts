import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  getAccessTokenMaxAgeSeconds,
  getRefreshTokenMaxAgeSeconds,
} from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { loginSchema } from '@/lib/validations'

const ACCESS_TOKEN_COOKIE = 'accessToken'
const REFRESH_TOKEN_COOKIE = 'refreshToken'
const REMEMBER_ME_COOKIE = 'rememberMe'

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`🔐 [LOGIN-API-${requestId}] Nueva solicitud de login recibida`)
  console.log(`📍 [LOGIN-API-${requestId}] DATABASE_URL configurada:`, process.env.DATABASE_URL ? '✅ Sí' : '❌ No')
  console.log(`📍 [LOGIN-API-${requestId}] NODE_ENV:`, process.env.NODE_ENV)
  
  try {
    const body = await request.json()
    console.log(`📧 [LOGIN-API-${requestId}] Email solicitado:`, body.email)
    
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      console.error(`❌ [LOGIN-API-${requestId}] Validación fallida:`, validation.error.errors)
      return errorResponse(validation.error.errors[0].message, 400)
    }

    const { email, password, rememberMe = false } = validation.data
    console.log(`🔍 [LOGIN-API-${requestId}] Buscando usuario en BD...`)
    console.log(`📍 [LOGIN-API-${requestId}] Intentando conectar a Prisma...`)

    let user
    try {
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          userCompanies: {
            include: {
              company: true,
            },
          },
        },
      })
      console.log(`✅ [LOGIN-API-${requestId}] Conexión a BD exitosa`)
    } catch (dbError) {
      console.error(`🚨 [LOGIN-API-${requestId}] Error de conexión a BD:`, dbError)
      console.error(`📍 [LOGIN-API-${requestId}] Error tipo:`, dbError instanceof Error ? dbError.constructor.name : typeof dbError)
      console.error(`📍 [LOGIN-API-${requestId}] Error mensaje:`, dbError instanceof Error ? dbError.message : String(dbError))
      throw dbError
    }

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

    if (companies.length === 0 || companies.every(c => !c.role)) {
      console.warn(`⚠️ [LOGIN-API-${requestId}] Usuario sin rol asignado:`, email)
      return errorResponse('No tienes un rol asignado. Contacta al administrador.', 403)
    }

    console.log(`✅ [LOGIN-API-${requestId}] Login exitoso para:`, user.email)

    const response = successResponse({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      companies,
      requiresCompanySelection: companies.length > 1,
    })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    const accessTokenMaxAge = getAccessTokenMaxAgeSeconds()
    const refreshTokenMaxAge = getRefreshTokenMaxAgeSeconds()

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: accessTokenMaxAge,
    })

    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: refreshTokenMaxAge } : {}),
    })

    response.cookies.set(REMEMBER_ME_COOKIE, rememberMe ? 'true' : 'false', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(rememberMe ? { maxAge: refreshTokenMaxAge } : {}),
    })

    return response
  } catch (error) {
    console.error(`🚨 [LOGIN-API-${requestId}] Error crítico:`, error)
    console.error(`📍 [LOGIN-API-${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack available')
    return errorResponse('Error al iniciar sesión', 500)
  }
}
