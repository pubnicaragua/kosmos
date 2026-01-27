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

    try {
      const response = await loginUser(email, password, rememberMe)
      
      if (response.requiresCompanySelection) {
        router.push('/onboarding')
      } else {
        if (response.companies.length > 0) {
          localStorage.setItem('activeCompany', JSON.stringify(response.companies[0]))
        }
        router.push('/dashboards')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full py-6 px-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <h1 className="text-2xl font-medium text-primary text-center mb-8">
              Inicia sesión
            </h1>

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

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" disabled />
                <span className="text-sm text-gray-600">No soy un robot</span>
                <div className="ml-auto">
                  <div className="text-xs text-gray-400">reCAPTCHA</div>
                  <div className="text-xs text-gray-400">Privacy - Terms</div>
                </div>
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={isLoading}
                className="uppercase"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-4 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-end gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-700">Soporte</a>
          <a href="#" className="hover:text-gray-700">Privacidad</a>
          <a href="#" className="hover:text-gray-700">Términos</a>
        </div>
        <div className="max-w-7xl mx-auto mt-2 text-xs text-gray-400 text-left">
          © 2024 CorpCRM. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
