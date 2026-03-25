import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

export const selectCompanySchema = z.object({
  companyId: z.string().min(1, 'ID de empresa requerido'),
})

export const dashboardFiltersSchema = z.object({
  companyId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const incomesFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED', 'ERROR']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
})

export const expenseSchema = z.object({
  provider: z.string().min(1, 'Proveedor requerido'),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().min(1, 'Categoría requerida'),
  method: z.string().min(1, 'Método de pago requerido'),
  amount: z.number().positive('El monto debe ser positivo'),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional(),
  date: z.string(),
  refNumber: z.string().optional(),
})

export const expensesFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional(),
  provider: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const activitySchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'QUOTE', 'OTHER']),
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  client: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string(),
})

export const activitiesFiltersSchema = z.object({
  companyId: z.string().optional(),
  type: z.enum(['CALL', 'MEETING', 'QUOTE', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const opportunitySchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  client: z.string().min(1, 'Cliente requerido'),
  value: z.number().positive('El valor debe ser positivo'),
  stage: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO']),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  closeDate: z.string().optional(),
})

export const opportunitiesFiltersSchema = z.object({
  companyId: z.string().optional(),
  stage: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO']).optional(),
})

export const documentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.enum(['DOC', 'PDF', 'XLSX', 'PNG', 'OTHER']),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().optional(),
  fileUrl: z.string().url('URL inválida'),
  fileSize: z.number().positive('Tamaño inválido'),
})

export const documentsFiltersSchema = z.object({
  companyId: z.string().optional(),
  type: z.enum(['DOC', 'PDF', 'XLSX', 'PNG', 'OTHER']).optional(),
})

export const contractSchema = z.object({
  contractId: z.string().min(1, 'ID de contrato requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().optional(),
  party: z.string().min(1, 'Contraparte requerida'),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  endDate: z.string().min(1, 'Fecha de fin requerida'),
  fileUrl: z.string().optional(),
  uploadedBy: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// ============================================
// SPRINT 3 - CLIENTES, INVENTARIO, TICKETS
// ============================================

// Nicaragua validation patterns
const nicaraguaCedulaPattern = /^\d{3}-\d{6}-\d{4}[A-Z]$/
const nicaraguaRucPattern = /^J\d{13}$/

// Clients
export const clientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ruc: z.string().optional().refine(
    (val) => !val || nicaraguaRucPattern.test(val),
    { message: 'RUC debe tener formato: J0310000000000 (J seguido de 13 dígitos)' }
  ),
  cedula: z.string().optional().refine(
    (val) => !val || nicaraguaCedulaPattern.test(val),
    { message: 'Cédula debe tener formato: 000-000000-0000X (ej: 001-010190-0001A)' }
  ),
  taxId: z.string().optional(),
  status: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO', 'ACTIVO', 'INACTIVO']).optional(),
  contactName: z.string().min(1, 'Nombre de contacto requerido'),
  notes: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Quotes
export const quoteItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).optional(),
})

export const quoteSchema = z.object({
  quoteNumber: z.string().min(1, 'Número de cotización requerido'),
  clientId: z.string().min(1, 'Cliente requerido'),
  currency: z.string().default('USD'),
  paymentMethod: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'),
  taxApplies: z.boolean().default(true),
  validUntil: z.string().min(1, 'Fecha de validez requerida'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un item'),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Products
export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  sku: z.string().min(1, 'SKU requerido'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default('UNI'),
  stock: z.number().min(0, 'Stock debe ser mayor o igual a 0').optional(),
  minStock: z.number().min(0).optional(),
  cost: z.number().min(0, 'Costo debe ser mayor o igual a 0').optional(),
  price: z.number().min(0, 'Precio debe ser mayor a 0'),
  netMargin: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Product Categories
export const productCategorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Tickets
export const ticketSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  type: z.enum([
    'INSTALACION_CAMARAS',
    'SOPORTE_REMOTO',
    'SOPORTE_SITIO',
    'GARANTIA',
    'MANTENIMIENTO_PREVENTIVO',
    'CONFIGURACION_DVR_NVR',
    'COTIZACION_TECNICA'
  ]).optional(),
  status: z.enum([
    'NUEVO',
    'ASIGNADO',
    'EN_PROCESO',
    'ESPERA_CLIENTE',
    'ESPERA_REPUESTO',
    'ESCALADO',
    'RESUELTO',
    'CERRADO',
    'CANCELADO'
  ]).optional(),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA']).optional(),
  assignedTo: z.string().optional(),
  branch: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.enum(['USD', 'NIO']).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  attachments: z.any().optional(),
  // Información técnica
  equipmentType: z.string().optional(),
  equipmentBrand: z.string().optional(),
  equipmentModel: z.string().optional(),
  serialNumber: z.string().optional(),
  installationDate: z.string().optional(),
  installedBy: z.string().optional(),
  evidence: z.any().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

export const contractsFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED']).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type SelectCompanyInput = z.infer<typeof selectCompanySchema>
export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>
export type IncomesFiltersInput = z.infer<typeof incomesFiltersSchema>
