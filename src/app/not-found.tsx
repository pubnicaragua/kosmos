'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center max-w-2xl mx-auto p-8">
        {/* Animated 404 Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <div className="relative">
            <svg className="w-64 h-64 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Página no encontrada
          </h2>
        </div>

        {/* Description */}
        <div className="mb-8 space-y-3">
          <p className="text-lg text-gray-600">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 font-medium mb-2">Posibles razones:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>La URL fue escrita incorrectamente</li>
              <li>El recurso fue eliminado o movido</li>
              <li>No tienes permisos para acceder a esta página</li>
              <li>El enlace que seguiste está desactualizado</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => router.back()}
            variant="outline"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver Atrás
          </Button>
          <Button 
            onClick={() => router.push('/dashboards')}
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir al Dashboard
          </Button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Enlaces rápidos:</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <button onClick={() => router.push('/clientes')} className="text-primary hover:underline">
              Clientes
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => router.push('/marketing')} className="text-primary hover:underline">
              Marketing
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => router.push('/pipeline-ventas')} className="text-primary hover:underline">
              Pipeline
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => router.push('/ingresos')} className="text-primary hover:underline">
              Ingresos
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => router.push('/gastos')} className="text-primary hover:underline">
              Gastos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
