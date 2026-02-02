export interface NavItem {
  id: string
  label: string
  href: string
  icon: string
  section?: string
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export const navigationSections: NavSection[] = [
  {
    id: 'general',
    label: 'GENERAL',
    items: [
      {
        id: 'dashboards',
        label: 'Resumen Ejecutivo',
        href: '/dashboards',
        icon: 'LayoutDashboard',
      },
    ],
  },
  {
    id: 'finanzas',
    label: 'FINANZAS',
    items: [
      {
        id: 'incomes',
        label: 'Ingresos',
        href: '/ingresos',
        icon: 'DollarSign',
      },
      {
        id: 'expenses',
        label: 'Gastos',
        href: '/gastos',
        icon: 'TrendingDown',
      },
    ],
  },
  {
    id: 'gestion',
    label: 'GESTIÓN',
    items: [
      {
        id: 'activities',
        label: 'Actividades',
        href: '/actividades',
        icon: 'Clipboard',
      },
      {
        id: 'clients',
        label: 'Clientes',
        href: '/clientes',
        icon: 'Users',
      },
      {
        id: 'sales-pipeline',
        label: 'Pipeline',
        href: '/pipeline-ventas',
        icon: 'Filter',
      },
      {
        id: 'marketing',
        label: 'Marketing',
        href: '/marketing',
        icon: 'Megaphone',
      },
      {
        id: 'inventory',
        label: 'Inventario',
        href: '/inventario',
        icon: 'Package',
      },
      {
        id: 'support',
        label: 'Tickets & Soporte',
        href: '/tickets-soporte',
        icon: 'HelpCircle',
      },
    ],
  },
  {
    id: 'documentos',
    label: 'DOCUMENTOS',
    items: [
      {
        id: 'documents',
        label: 'Documentos',
        href: '/documentos',
        icon: 'FileText',
      },
      {
        id: 'contracts',
        label: 'Contratos',
        href: '/contratos',
        icon: 'FileSignature',
      },
    ],
  },
  {
    id: 'configuracion',
    label: 'CONFIGURACIÓN',
    items: [
      {
        id: 'system',
        label: 'Ajustes',
        href: '/sistema',
        icon: 'Settings',
      },
    ],
  },
]

// Mantener compatibilidad con código existente
export const navigationItems: NavItem[] = navigationSections.flatMap(section => section.items)
