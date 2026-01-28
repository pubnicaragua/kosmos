export interface NavItem {
  id: string
  label: string
  href: string
  icon?: string
  children?: NavItem[]
}

export const navigationItems: NavItem[] = [
  {
    id: 'dashboards',
    label: 'Dashboards',
    href: '/dashboards',
  },
  {
    id: 'incomes',
    label: 'Ingresos',
    href: '/ingresos',
  },
  {
    id: 'expenses',
    label: 'Gastos',
    href: '/gastos',
  },
  {
    id: 'activities',
    label: 'Actividades',
    href: '/actividades',
  },
  {
    id: 'clients',
    label: 'Clientes',
    href: '/clientes',
  },
  {
    id: 'sales-pipeline',
    label: 'Pipeline de Ventas',
    href: '/pipeline-ventas',
  },
  {
    id: 'documents',
    label: 'Documentos',
    href: '/documentos',
  },
  {
    id: 'contracts',
    label: 'Contratos',
    href: '/contratos',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    href: '/inventario',
  },
  {
    id: 'support',
    label: 'Tickets & Soporte',
    href: '/tickets-soporte',
  },
  {
    id: 'deliverables',
    label: 'Carpeta de Entregables',
    href: '/entregables',
  },
  {
    id: 'system',
    label: 'Sistema',
    href: '/sistema',
  },
]
