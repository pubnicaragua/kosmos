import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'KOSMOS CRM',
    template: '%s | KOSMOS CRM'
  },
  description: 'Sistema CRM multi-empresa profesional para gestión de clientes, ventas, inventario, tickets y más. Optimiza tu negocio con KOSMOS.',
  keywords: ['CRM', 'gestión empresarial', 'clientes', 'ventas', 'inventario', 'tickets', 'cotizaciones', 'multi-empresa'],
  authors: [{ name: 'KOSMOS CRM' }],
  creator: 'KOSMOS CRM',
  publisher: 'KOSMOS CRM',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    title: 'KOSMOS CRM - Sistema de Gestión Empresarial',
    description: 'Sistema CRM multi-empresa profesional para gestión completa de tu negocio',
    siteName: 'KOSMOS CRM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KOSMOS CRM - Sistema de Gestión Empresarial',
    description: 'Sistema CRM multi-empresa profesional para gestión completa de tu negocio',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
