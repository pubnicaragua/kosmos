'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/common/Logo'
import { Input } from '@/components/ui-kit/Input'
import { Button } from '@/components/ui-kit/Button'
import { Checkbox } from '@/components/ui-kit/Checkbox'
import { loginUser } from '@/lib/client-auth'
import { InfoModal } from '@/components/ui-kit/InfoModal'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

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
          <button onClick={() => setShowSupportModal(true)} className="hover:text-indigo-600 transition-colors">Soporte</button>
          <button onClick={() => setShowPrivacyModal(true)} className="hover:text-indigo-600 transition-colors">Privacidad</button>
          <button onClick={() => setShowTermsModal(true)} className="hover:text-indigo-600 transition-colors">Términos</button>
        </div>
        <div className="max-w-7xl mx-auto mt-2 text-xs text-gray-500 text-left">
          © 2026 KosmosCRM. Todos los derechos reservados.
        </div>
      </footer>

      {/* Modal de Soporte */}
      <InfoModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} title="Soporte Técnico">
        <div className="space-y-6">
          <p className="text-gray-700">
            ¿Necesitas ayuda? Nuestro equipo de soporte está disponible para asistirte.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Correo Electrónico
              </h3>
              <a href="mailto:desarrollo@softwarenicaragua.com" className="text-blue-600 hover:text-blue-700 font-medium">
                desarrollo@softwarenicaragua.com
              </a>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </h3>
              <a href="https://wa.me/50588241003" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium">
                +505 8824 1003
              </a>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Horario de atención: Lunes a Viernes, 8:00 AM - 6:00 PM
          </p>
        </div>
      </InfoModal>

      {/* Modal de Privacidad */}
      <InfoModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Política de Privacidad">
        <div className="space-y-4 text-gray-700">
          <p>
            En KosmosCRM, nos comprometemos a proteger tu privacidad y la seguridad de tus datos.
          </p>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Recopilación de Datos</h3>
            <p className="text-sm">
              Recopilamos únicamente la información necesaria para proporcionar nuestros servicios, incluyendo datos de contacto, información empresarial y datos de uso de la plataforma.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Uso de la Información</h3>
            <p className="text-sm">
              Utilizamos tu información para mejorar nuestros servicios, proporcionar soporte técnico y mantener la seguridad de la plataforma.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Seguridad</h3>
            <p className="text-sm">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra acceso no autorizado, pérdida o alteración.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Tus Derechos</h3>
            <p className="text-sm">
              Tienes derecho a acceder, rectificar o eliminar tus datos personales en cualquier momento. Contáctanos para ejercer estos derechos.
            </p>
          </div>
        </div>
      </InfoModal>

      {/* Modal de Términos */}
      <InfoModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Términos y Condiciones">
        <div className="space-y-4 text-gray-700">
          <p>
            Al utilizar KosmosCRM, aceptas los siguientes términos y condiciones de uso.
          </p>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Uso del Servicio</h3>
            <p className="text-sm">
              KosmosCRM es una plataforma de gestión empresarial diseñada para optimizar procesos de negocio. Te comprometes a utilizar el servicio de manera legal y ética.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Responsabilidades del Usuario</h3>
            <p className="text-sm">
              Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades realizadas bajo tu cuenta.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Propiedad Intelectual</h3>
            <p className="text-sm">
              Todo el contenido, diseño y funcionalidades de KosmosCRM son propiedad exclusiva de la empresa y están protegidos por leyes de propiedad intelectual.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Limitación de Responsabilidad</h3>
            <p className="text-sm">
              KosmosCRM se proporciona "tal cual" y no garantizamos que el servicio esté libre de errores o interrupciones. No nos hacemos responsables de daños indirectos o consecuentes.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Modificaciones</h3>
            <p className="text-sm">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos de cambios significativos.
            </p>
          </div>
        </div>
      </InfoModal>
    </div>
  )
}
