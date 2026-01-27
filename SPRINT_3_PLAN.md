# SPRINT 3 - PLAN DE IMPLEMENTACIÓN

## ✅ COMPLETADO
- [x] Schema Prisma (Client, Quote, QuoteItem, Product, ProductCategory, Ticket)
- [x] Validaciones Zod para todos los modelos
- [x] Eliminar RRHH del sidebar
- [x] Actualizar navigation.ts

## 🚧 EN PROGRESO

### 1. MÓDULO CLIENTES (4 vistas)
**Vista 1: Listado de Clientes** (`/clientes`)
- Tabla con: Empresa, Cliente, Contacto, Estado, Acciones
- Tabs: TODAS, PROSPECTO, PROPUESTA, NEGOCIACIÓN, CALIFICADO
- Filtros: Empresa, búsqueda
- Botones: EDITAR, MULTIAGREGADO, NUEVO CLIENTE

**Vista 2: Multiagregado** (`/clientes/multiagregado`)
- Tabla editable inline tipo Excel
- Campos: #, IMAGEN, NOMBRE DEL CLIENTE, ESTADO, CORREO, TELÉFONO, ACCIONES
- Navegación con teclado (TAB, ENTER)
- Botones: CANCELAR, GUARDAR

**Vista 3: Nueva Cotización** (`/clientes/cotizacion/nueva`)
- Breadcrumb: CLIENTES > MULTIAGREGADO > NUEVA COTIZACIÓN
- Secciones:
  - NOTAS PARA EL CLIENTE (visible en PDF)
  - NOTAS INTERNAS (privado)
  - DETALLES GENERALES (Moneda, Fechas, Vendedor)
  - Tabla de productos (#, PRODUCTO/SERVICIO, CANT., PRECIO UNIT., DESC. %, IMPUESTO, TOTAL)
  - SUBTOTAL, DESCUENTO TOTAL, IVA (15%), TOTAL
- Botones: CANCELAR, GUARDAR BORRADOR, FINALIZAR

**Vista 4: Detalle de Cotización** (`/clientes/cotizacion/[id]`)
- Breadcrumb: CLIENTES > MULTIAGREGADO > COTIZACIÓN #COT-2026-16/01
- Secciones:
  - DETALLE DE CONCEPTOS (tabla de productos)
  - APROBACIÓN (botones APROBAR/RECHAZAR)
  - Datos del cliente (contacto, correo, teléfono)
  - HISTORIAL (timeline de cambios)
  - TÉRMINOS Y CONDICIONES
  - NOTAS INTERNAS
- Botones: EDITAR, IMPRIMIR, ENVIAR AL CLIENTE

### 2. MÓDULO INVENTARIO (2 vistas)
**Vista 1: Listado** (`/inventario`)
- Tabla: PRODUCTO, STOCK, CATEGORÍA, DESC., SKU, COSTO, PRECIO
- Tabs: TODOS LOS PRODUCTOS, MAYOR STOCK, MENOR STOCK
- Filtros: Empresa
- Botones: MERMAS, IMPORTAR/ACTUALIZAR PRODUCTOS, EDITAR/AGREGAR PRODUCTO

**Vista 2: Edición/Agregado** (`/inventario/edicion`)
- Tabla editable inline tipo Excel
- Campos: PRODUCTO, UNI/KG, CATEGORÍA, DESC., SKU, COSTO, PRECIO
- Navegación con teclado
- Botones: CANCELAR, GUARDAR BORRADOR, FINALIZAR

### 3. MÓDULO TICKETS & SOPORTE (1 vista)
**Vista Kanban** (`/tickets-soporte`)
- 4 columnas: PROCESO1, PROCESO2, PROCESO3, PROCESO4
- Cada columna muestra: Total $ y cantidad
- Cards con: Badge estado, Título, Cliente, Fecha cierre, Monto, Avatar
- Drag & drop entre columnas
- Filtros: Empresa, Período
- Botones: EXPORTAR, EDITAR, AÑADIR

## 📋 ENDPOINTS A CREAR

### Clientes
- GET `/api/clients` - Listar con filtros
- POST `/api/clients` - Crear cliente
- POST `/api/clients/bulk` - Crear múltiples (multiagregado)
- PUT `/api/clients/[id]` - Actualizar
- DELETE `/api/clients/[id]` - Eliminar

### Cotizaciones
- GET `/api/quotes` - Listar
- GET `/api/quotes/[id]` - Detalle
- POST `/api/quotes` - Crear cotización
- PUT `/api/quotes/[id]` - Actualizar
- PUT `/api/quotes/[id]/status` - Cambiar estado (aprobar/rechazar)
- DELETE `/api/quotes/[id]` - Eliminar

### Inventario
- GET `/api/products` - Listar con filtros
- POST `/api/products` - Crear producto
- POST `/api/products/bulk` - Crear múltiples
- PUT `/api/products/[id]` - Actualizar
- DELETE `/api/products/[id]` - Eliminar
- GET `/api/product-categories` - Listar categorías
- POST `/api/product-categories` - Crear categoría

### Tickets
- GET `/api/tickets` - Listar con filtros
- POST `/api/tickets` - Crear ticket
- PUT `/api/tickets/[id]` - Actualizar
- PUT `/api/tickets/[id]/status` - Cambiar estado (drag&drop)
- DELETE `/api/tickets/[id]` - Eliminar

## 🎯 ORDEN DE IMPLEMENTACIÓN
1. ✅ Validaciones Zod
2. 🔄 Endpoints Clientes (básicos)
3. 🔄 Vista 1: Listado Clientes
4. 🔄 Vista 2: Multiagregado Clientes
5. 🔄 Endpoints Cotizaciones
6. 🔄 Vista 3: Nueva Cotización
7. 🔄 Vista 4: Detalle Cotización
8. 🔄 Endpoints Inventario
9. 🔄 Vista 1: Listado Inventario
10. 🔄 Vista 2: Edición Inventario
11. 🔄 Endpoints Tickets
12. 🔄 Vista Kanban Tickets
13. ✅ Migración Prisma
14. ✅ Build final

## 📝 NOTAS
- Todas las vistas deben ser 100% funcionales
- Código SOLID y escalable
- Responsive design
- Multi-empresa (filtrar por companyId)
- Sin placeholders
