'use client'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    avatar?: string
  }
  companies: Array<{
    id: string
    name: string
    logo?: string
    isActive: boolean
    role: string
  }>
  requiresCompanySelection: boolean
}

export async function loginUser(email: string, password: string, rememberMe: boolean): Promise<LoginResponse> {
  console.log('🌐 [CLIENT-AUTH] Preparando solicitud de login...')
  console.log('📊 [CLIENT-AUTH] Configuración:', { email, rememberMe })

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, rememberMe }),
    })

    console.log('📡 [CLIENT-AUTH] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    const data = await response.json()
    console.log('📦 [CLIENT-AUTH] Datos parseados:', { success: data.success, hasData: !!data.data })

    if (!response.ok) {
      console.error('❌ [CLIENT-AUTH] Error HTTP:', {
        status: response.status,
        message: data.message,
        error: data.error
      })
      throw new Error(data.message || 'Error al iniciar sesión')
    }

    if (data.success) {
      console.log('💾 [CLIENT-AUTH] Guardando tokens en localStorage...')
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.data.user))
      
      if (rememberMe) {
        console.log('✅ [CLIENT-AUTH] Opción "Recuérdame" activada')
        localStorage.setItem('rememberMe', 'true')
      }
      
      console.log('✅ [CLIENT-AUTH] Autenticación completada exitosamente')
      return data.data
    }

    console.error('❌ [CLIENT-AUTH] Respuesta sin éxito:', data)
    throw new Error(data.message || 'Error al iniciar sesión')
  } catch (error) {
    console.error('🚨 [CLIENT-AUTH] Excepción capturada:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 [CLIENT-AUTH] Error de red - servidor no disponible')
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
    }
    throw error
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('activeCompany')
}
