'use client'

import { useState } from 'react'

// Iconos SVG personalizados
const FileTextIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ServerIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
)

const MailIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const DatabaseIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const KeyIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const ChevronUpIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
)

export default function EntregablesPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const fases = [
    {
      numero: 1,
      nombre: 'Diseño UI/UX - Figma',
      estado: 'Completada',
      fechaPago: '8 de Enero 2026',
      fechaEntrega: 'Completado',
      descripcion: 'Diseño completo de la interfaz de usuario y experiencia de usuario en Figma',
      screenshot: '/entregables_fase2/FIGMAUI.png',
      entregables: [
        { nombre: 'Prototipo Figma', link: 'https://www.figma.com/proto/S2OO1tXHDWWX6oR2MgR3Dx/CRM-Multi-Empresas?node-id=0-1&p=f&t=sd6dP8h2yAOedQKv-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=55%3A163', tipo: 'Prototipo interactivo' },
        { nombre: 'Diseño Visual Figma', link: 'https://www.figma.com/design/S2OO1tXHDWWX6oR2MgR3Dx/CRM-Multi-Empresas?node-id=0-1&p=f&t=sd6dP8h2yAOedQKv-0', tipo: 'Diseño final' },
        { nombre: 'Repositorio GitHub', link: 'https://github.com/pubnicaragua/kosmos', tipo: 'Código Fuente - Público 1 hora' }
      ],
      githubInfo: {
        screenshot: '/entregables_fase2/GITHUB.png',
        descripcion: 'GitHub es una plataforma de control de versiones que almacena todo el código fuente del proyecto. Aquí puedes ver el historial completo de cambios, commits, ramas y toda la evolución del desarrollo. El repositorio está en PÚBLICO durante 1 hora para que puedas revisar el código. Normalmente se mantiene en PRIVADO y se da acceso solo a usuarios autorizados.'
      },
      color: 'from-green-500 to-emerald-600'
    },
    {
      numero: 2,
      nombre: 'Desarrollo Frontend',
      estado: 'Completada',
      fechaPago: '18 de Enero 2026',
      fechaEntrega: 'Completado',
      descripcion: 'Desarrollo del frontend con Next.js 14, React, TypeScript y TailwindCSS',
      entregables: [
        { nombre: 'Aplicación Web Desplegada', link: 'https://www.kosmoscrm.com', tipo: 'Producción' },
        { nombre: 'Panel de Vercel', link: 'https://vercel.com/kosmos-projects-2bcb3405', tipo: 'Dashboard' }
      ],
      color: 'from-blue-500 to-cyan-600'
    },
    {
      numero: 3,
      nombre: 'Desarrollo Backend + Base de Datos',
      estado: 'En Progreso',
      fechaPago: '28 de Enero 2026',
      fechaEntrega: 'Lunes 3 - Martes 4 Febrero 2026',
      descripcion: 'Implementación completa del backend con PostgreSQL, Prisma ORM, autenticación JWT y APIs REST',
      entregables: [
        { nombre: 'Base de Datos PostgreSQL', link: '', tipo: 'Servidor - VPS 186.1.56.251:5432' },
        { nombre: 'APIs REST Funcionales', link: '', tipo: 'Endpoints - https://www.kosmoscrm.com/api' },
        { nombre: 'Sistema de Autenticación', link: '', tipo: 'Seguridad - Login + JWT' }
      ],
      color: 'from-purple-500 to-pink-600'
    },
    {
      numero: 4,
      nombre: 'Pruebas, Validación y Documentación',
      estado: 'Pendiente',
      fechaPago: '6 de Febrero 2026',
      fechaEntrega: 'Por definir',
      descripcion: 'Pruebas exhaustivas, stress testing, validación de escenarios, documentación técnica y de usuario',
      entregables: [
        { nombre: 'Documentación Técnica', link: 'Por entregar', tipo: 'PDF/Markdown' },
        { nombre: 'Manual de Usuario', link: 'Por entregar', tipo: 'PDF/Video' },
        { nombre: 'Reporte de Pruebas', link: 'Por entregar', tipo: 'Documento' }
      ],
      color: 'from-orange-500 to-red-600'
    }
  ]

  const accesos = [
    {
      categoria: 'Vercel (Hosting Frontend)',
      icon: ServerIcon,
      items: [
        { label: 'URL Dashboard', value: 'https://vercel.com/kosmos-projects-2bcb3405', type: 'link' },
        { label: 'Email', value: 'kosmoscrm@softwarenicaragua.com', type: 'text' },
        { label: 'Contraseña', value: 'kadwlfmJj0kPjPyZ', type: 'password' }
      ]
    },
    {
      categoria: 'Correo Banahosting',
      icon: MailIcon,
      items: [
        { label: 'URL Webmail', value: 'https://bh8970.banahosting.com:2096/webmaillogout.cgi', type: 'link' },
        { label: 'Email', value: 'kosmoscrm@softwarenicaragua.com', type: 'text' },
        { label: 'Contraseña', value: 'kadwlfmJj0kPjPyZ', type: 'password' }
      ]
    },
    {
      categoria: 'Base de Datos PostgreSQL (VPS)',
      icon: DatabaseIcon,
      items: [
        { label: 'Host', value: '186.1.56.251', type: 'text' },
        { label: 'Puerto', value: '5432', type: 'text' },
        { label: 'Base de Datos', value: 'kosmos_crm', type: 'text' },
        { label: 'Usuario', value: 'kosmos_user', type: 'text' },
        { label: 'Contraseña', value: 'K0sm0sCRM_Pr0d_2026!', type: 'password' }
      ]
    },
    {
      categoria: 'ngrok (Tunnel TCP)',
      icon: KeyIcon,
      items: [
        { label: 'URL Actual', value: 'tcp://8.tcp.ngrok.io:12797', type: 'text' },
        { label: 'Dashboard', value: 'https://dashboard.ngrok.com', type: 'link' },
        { label: 'Authtoken', value: '38tFa27GmjG7RtQz5W2QreTaxPq_64g79AqYQkj6krcKwWTJ2', type: 'password' }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <div className="w-8 h-8 text-white"><FileTextIcon /></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Carpeta de Entregables
              </h1>
              <p className="text-slate-600 mt-1">Proyecto Kosmos CRM - Gestión de Fases y Accesos</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 font-medium">Fases Completadas</p>
              <p className="text-3xl font-bold text-green-600 mt-1">2 / 4</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Fase Actual</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">Fase 3</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Progreso Total</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">50%</p>
            </div>
          </div>
        </div>

        {/* Fases del Proyecto */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            Fases del Proyecto
          </h2>
          
          {fases.map((fase) => (
            <div key={fase.numero} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div 
                className={`bg-gradient-to-r ${fase.color} p-6 cursor-pointer`}
                onClick={() => setExpandedPhase(expandedPhase === fase.numero ? null : fase.numero)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{fase.numero}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{fase.nombre}</h3>
                      <p className="text-white/90 text-sm mt-1">{fase.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      fase.estado === 'Completada' ? 'bg-green-500 text-white' :
                      fase.estado === 'En Progreso' ? 'bg-yellow-500 text-white' :
                      'bg-slate-500 text-white'
                    }`}>
                      {fase.estado}
                    </span>
                    {expandedPhase === fase.numero ? (
                      <div className="w-6 h-6 text-white"><ChevronUpIcon /></div>
                    ) : (
                      <div className="w-6 h-6 text-white"><ChevronDownIcon /></div>
                    )}
                  </div>
                </div>
              </div>

              {expandedPhase === fase.numero && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 font-medium">Fecha de Pago</p>
                      <p className="text-lg font-semibold text-slate-800 mt-1">{fase.fechaPago}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 font-medium">Fecha de Entrega</p>
                      <p className="text-lg font-semibold text-slate-800 mt-1">{fase.fechaEntrega}</p>
                    </div>
                  </div>

                  {fase.screenshot && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-slate-800 mb-3">Captura de Pantalla</h4>
                      <img 
                        src={fase.screenshot} 
                        alt={`Screenshot ${fase.nombre}`}
                        className="w-full rounded-lg border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(fase.screenshot, '_blank')}
                      />
                    </div>
                  )}

                  {fase.githubInfo && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-lg border-2 border-gray-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gray-800 rounded-lg">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-800">¿Qué es GitHub?</h4>
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                        {fase.githubInfo.descripcion}
                      </p>

                      {fase.githubInfo.screenshot && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-slate-600 mb-2">Comprobante del Repositorio:</p>
                          <img 
                            src={fase.githubInfo.screenshot} 
                            alt="GitHub Repository"
                            className="w-full rounded-lg border border-slate-300 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(fase.githubInfo.screenshot, '_blank')}
                          />
                        </div>
                      )}

                      <div className="bg-white p-4 rounded-lg border border-slate-200 mt-4">
                        <p className="text-xs font-semibold text-slate-600 mb-2">⏰ ACCESO TEMPORAL:</p>
                        <ul className="text-sm text-slate-700 space-y-1">
                          <li>✅ Repositorio: <span className="font-mono text-blue-600">https://github.com/pubnicaragua/kosmos</span></li>
                          <li>✅ Estado: <span className="font-semibold text-green-600">PÚBLICO (1 hora)</span></li>
                          <li>✅ Contenido: Código fuente completo, historial de commits, ramas y evolución del proyecto</li>
                          <li>⚠️ Nota: Después de 1 hora, el repositorio volverá a PRIVADO</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">Entregables</h4>
                    <div className="space-y-2">
                      {fase.entregables.map((entregable, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div>
                            <p className="font-semibold text-slate-800">{entregable.nombre}</p>
                            <p className="text-sm text-slate-600">{entregable.tipo}</p>
                          </div>
                          {entregable.link && entregable.link.startsWith('http') && (
                            <a 
                              href={entregable.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <div className="w-4 h-4"><ExternalLinkIcon /></div>
                              Abrir
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Accesos y Credenciales */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
            Accesos y Credenciales
          </h2>

          {accesos.map((acceso, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                  <acceso.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{acceso.categoria}</h3>
              </div>

              <div className="space-y-3">
                {acceso.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 font-medium">{item.label}</p>
                      {item.type === 'link' ? (
                        <a 
                          href={item.value} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-mono text-sm flex items-center gap-1 mt-1"
                        >
                          {item.value}
                          <div className="w-3 h-3"><ExternalLinkIcon /></div>
                        </a>
                      ) : item.type === 'password' ? (
                        <p className="font-mono text-sm text-slate-800 mt-1">{'•'.repeat(item.value.length)}</p>
                      ) : (
                        <p className="font-mono text-sm text-slate-800 mt-1">{item.value}</p>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value, `${acceso.categoria}-${item.label}`)}
                      className="ml-4 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Copiar"
                    >
                      {copiedField === `${acceso.categoria}-${item.label}` ? (
                        <div className="w-5 h-5 text-green-600"><CheckIcon /></div>
                      ) : (
                        <div className="w-5 h-5 text-slate-600"><CopyIcon /></div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Documentación de Soporte */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <div className="w-6 h-6 text-white"><ImageIcon /></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Documentación de Soporte</h2>
          </div>

          <p className="text-slate-600 mb-4">
            Capturas de pantalla y evidencias del proceso de configuración del servidor, base de datos y despliegue.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
              <button 
                key={num} 
                onClick={() => setSelectedImage(`/entregables_fase2/image (${num}).png`)}
                className="relative group block w-full"
              >
                <img
                  src={`/entregables_fase2/image (${num}).png`}
                  alt={`Soporte ${num}`}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 group-hover:scale-105 transition-transform cursor-pointer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 text-white"><ExternalLinkIcon /></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modal de Imagen */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div 
              className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 transition-colors"
                title="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="w-full h-auto"
              />
              
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">Presiona ESC o haz clic fuera para cerrar</p>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white text-center">
          <p className="text-lg font-semibold">Proyecto Kosmos CRM</p>
          <p className="text-sm text-white/80 mt-1">Desarrollado por Software Nicaragua</p>
          <p className="text-xs text-white/60 mt-2">Última actualización: 28 de Enero 2026</p>
        </div>
      </div>
    </div>
  )
}
