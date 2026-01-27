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
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, rememberMe }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión')
  }

  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true')
    }
    
    return data.data
  }

  throw new Error(data.message || 'Error al iniciar sesión')
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
