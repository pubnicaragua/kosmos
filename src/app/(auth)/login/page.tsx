'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/common/Logo'
import { Input } from '@/components/ui-kit/Input'
import { Button } from '@/components/ui-kit/Button'
import { Checkbox } from '@/components/ui-kit/Checkbox'
import { loginUser } from '@/lib/client-auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    console.log('🔐 [LOGIN] Iniciando proceso de autenticación...')
    console.log('📧 [LOGIN] Email:', email)

    try {
      console.log('⏳ [LOGIN] Enviando credenciales al servidor...')
      const response = await loginUser(email, password, rememberMe)
      
      console.log('✅ [LOGIN] Autenticación exitosa')
      console.log('👤 [LOGIN] Usuario:', response.user.name)
      console.log('🏢 [LOGIN] Empresas disponibles:', response.companies.length)
      
      if (response.requiresCompanySelection) {
        console.log('🔄 [LOGIN] Redirigiendo a selección de empresa...')
        router.push('/onboarding')
      } else {
        if (response.companies.length > 0) {
          console.log('🏢 [LOGIN] Empresa activa:', response.companies[0].name)
          localStorage.setItem('activeCompany', JSON.stringify(response.companies[0]))
        }
        console.log('🚀 [LOGIN] Redirigiendo al dashboard...')
        router.push('/dashboards')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión'
      console.error('❌ [LOGIN] Error de autenticación:', errorMessage)
      console.error('🔍 [LOGIN] Detalles del error:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      console.log('🏁 [LOGIN] Proceso finalizado')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="w-full py-6 px-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 transform transition-all duration-300 hover:shadow-3xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Bienvenido de nuevo
              </h1>
              <p className="text-gray-600 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="email"
                label="Correo electrónico"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Recuérdame"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <a href="#" className="text-sm text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg shadow-sm animate-shake">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium text-sm">{error}</p>
                      <p className="text-xs text-red-600 mt-1">Verifica tus credenciales e intenta nuevamente</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-4 bg-white/80 backdrop-blur-sm border-t border-gray-200/50">
        <div className="max-w-7xl mx-auto flex justify-end gap-6 text-sm text-gray-600">
          <a href="#" className="hover:text-indigo-600 transition-colors">Soporte</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Privacidad</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Términos</a>
        </div>
        <div className="max-w-7xl mx-auto mt-2 text-xs text-gray-500 text-left">
          © 2026 KosmosCRM. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
