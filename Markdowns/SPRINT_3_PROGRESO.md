# SPRINT 3 - PROGRESO ACTUAL

**Fecha:** 27 de enero de 2026  
**Estado:** 🚧 EN PROGRESO (30% completado)

---

## ✅ COMPLETADO

### 1. Infraestructura Backend
- [x] **Schema Prisma** - 6 modelos nuevos agregados:
  - `Client` (clientes con estados)
  - `Quote` (cotizaciones)
  - `QuoteItem` (items de cotización)
  - `Product` (productos de inventario)
  - `ProductCategory` (categorías)
  - `Ticket` (tickets de soporte)
- [x] **Enums** - 4 nuevos enums:
  - `ClientStatus` (PROSPECTO, PROPUESTA, NEGOCIACION, CALIFICADO, ACTIVO, INACTIVO)
  - `QuoteStatus` (DRAFT, SENT, APPROVED, REJECTED, EXPIRED)
  - `TicketStatus` (PROCESO1, PROCESO2, PROCESO3, PROCESO4)
  - `TicketPriority` (LOW, MEDIUM, HIGH, URGENT)
- [x] **Validaciones Zod** - Schemas completos para todos los modelos
- [x] **Navegación** - RRHH eliminado del sidebar

### 2. Módulo Clientes (25% completado)
- [x] **Endpoints API**:
  - `GET /api/clients` - Listar con filtros (empresa, estado, búsqueda)
  - `POST /api/clients` - Crear cliente individual
  - `POST /api/clients/bulk` - Crear múltiples clientes (multiagregado)
  - `PUT /api/clients/[id]` - Actualizar cliente
  - `DELETE /api/clients/[id]` - Eliminar cliente

- [x] **Vista 1: Listado de Clientes** (`/clientes`) - **259 líneas**
  - ✅ Tabla con: Empresa, Cliente (avatar), Contacto (email/teléfono), Estado, Acciones
  - ✅ 5 Tabs: TODAS, PROSPECTO, PROPUESTA, NEGOCIACIÓN, CALIFICADO
  - ✅ Filtros: Selector de empresa, búsqueda por nombre/email/teléfono
  - ✅ Botones: EDITAR, MULTIAGREGADO, NUEVO CLIENTE
  - ✅ Badges de estado con colores
  - ✅ Paginación funcional
  - ✅ Avatares con iniciales
  - ✅ Iconos de email y teléfono

---

## 🚧 PENDIENTE (70%)

### 3. Módulo Clientes - Vistas Restantes (3 vistas)

#### Vista 2: Multiagregado (`/clientes/multiagregado`)
**Complejidad:** Alta  
**Estimación:** ~400 líneas  
**Características:**
- Tabla editable inline tipo Excel
- Campos: #, IMAGEN, NOMBRE, ESTADO (dropdown), CORREO, TELÉFONO, ACCIONES
- Navegación con teclado (TAB, ENTER, flechas)
- Agregar/eliminar filas dinámicamente
- Botones: CANCELAR, GUARDAR
- Validación en tiempo real
- Guardar múltiples registros en una sola petición

#### Vista 3: Nueva Cotización (`/clientes/cotizacion/nueva`)
**Complejidad:** Muy Alta  
**Estimación:** ~600 líneas  
**Características:**
- Breadcrumb: CLIENTES > MULTIAGREGADO > NUEVA COTIZACIÓN
- **Sección 1:** NOTAS PARA EL CLIENTE (textarea, visible en PDF)
- **Sección 2:** NOTAS INTERNAS (textarea, privado)
- **Sección 3:** DETALLES GENERALES
  - Moneda (selector: C$ NIO, $ USD)
  - Fecha de emisión (date picker)
  - Fecha de vencimiento (date picker)
  - Vendedor (selector)
- **Sección 4:** Tabla de Productos
  - Columnas: #, PRODUCTO/SERVICIO, CANT., PRECIO UNIT., DESC. %, IMPUESTO, TOTAL
  - Agregar/eliminar productos
  - Cálculo automático de totales
  - Búsqueda de productos del inventario
- **Sección 5:** Totales
  - SUBTOTAL (calculado)
  - DESCUENTO TOTAL (input + %)
  - IVA 15% (calculado)
  - TOTAL (calculado)
- Botones: CANCELAR, GUARDAR BORRADOR, FINALIZAR
- Navegación con teclado (TAB, CTRL+ALT+SUPR para borrar fila, ENTER para confirmar)

#### Vista 4: Detalle de Cotización (`/clientes/cotizacion/[id]`)
**Complejidad:** Alta  
**Estimación:** ~500 líneas  
**Características:**
- Breadcrumb: CLIENTES > MULTIAGREGADO > COTIZACIÓN #COT-2026-16/01
- **Panel izquierdo:**
  - DETALLE DE CONCEPTOS (tabla read-only de productos)
  - TÉRMINOS Y CONDICIONES (texto)
  - NOTAS INTERNAS (texto con badge "NOTA DE JUAN PÉREZ")
- **Panel derecho:**
  - APROBACIÓN (botones APROBAR/RECHAZAR con threshold $5,000)
  - Datos del cliente (contacto, correo, teléfono con iconos)
  - HISTORIAL (timeline de cambios con timestamps)
- Botones superiores: EDITAR, IMPRIMIR, ENVIAR AL CLIENTE
- Totales: SUBTOTAL, DESCUENTO TOTAL, IVA 15%, TOTAL

### 4. Endpoints Cotizaciones (6 endpoints)
- [ ] `GET /api/quotes` - Listar cotizaciones
- [ ] `GET /api/quotes/[id]` - Detalle de cotización
- [ ] `POST /api/quotes` - Crear cotización con items
- [ ] `PUT /api/quotes/[id]` - Actualizar cotización
- [ ] `PUT /api/quotes/[id]/status` - Aprobar/rechazar
- [ ] `DELETE /api/quotes/[id]` - Eliminar

### 5. Módulo Inventario (2 vistas + endpoints)

#### Vista 1: Listado (`/inventario`)
**Estimación:** ~350 líneas  
**Características:**
- Tabla: PRODUCTO, STOCK, CATEGORÍA, DESC., SKU, COSTO, PRECIO
- 3 Tabs: TODOS LOS PRODUCTOS, MAYOR STOCK, MENOR STOCK
- Filtros: Empresa
- Botones: MERMAS, IMPORTAR/ACTUALIZAR, EDITAR/AGREGAR
- Paginación

#### Vista 2: Edición/Agregado (`/inventario/edicion`)
**Estimación:** ~400 líneas  
**Características:**
- Tabla editable inline tipo Excel
- Campos: PRODUCTO, UNI/KG, CATEGORÍA (dropdown), DESC., SKU, COSTO, PRECIO
- Navegación con teclado
- Categorías dinámicas (crear sobre la marcha)
- Botones: CANCELAR, GUARDAR BORRADOR, FINALIZAR

#### Endpoints Inventario (7 endpoints)
- [ ] `GET /api/products` - Listar con filtros
- [ ] `POST /api/products` - Crear producto
- [ ] `POST /api/products/bulk` - Crear múltiples
- [ ] `PUT /api/products/[id]` - Actualizar
- [ ] `DELETE /api/products/[id]` - Eliminar
- [ ] `GET /api/product-categories` - Listar categorías
- [ ] `POST /api/product-categories` - Crear categoría

### 6. Módulo Tickets & Soporte (1 vista + endpoints)

#### Vista Kanban (`/tickets-soporte`)
**Estimación:** ~450 líneas  
**Características:**
- 4 columnas Kanban: PROCESO1, PROCESO2, PROCESO3, PROCESO4
- Cada columna muestra: Total $ y cantidad de tickets
- Cards con:
  - Badge de estado (Pendiente)
  - Título del ticket
  - Cliente (nombre)
  - Fecha de cierre (con icono calendario)
  - Monto (con icono $)
  - Avatar del responsable
- Drag & drop entre columnas (actualiza estado)
- Filtros: Empresa, Período (ÚLTIMO MES con date picker)
- Botones: EXPORTAR, EDITAR, AÑADIR
- Placeholders para columnas vacías

#### Endpoints Tickets (5 endpoints)
- [ ] `GET /api/tickets` - Listar con filtros
- [ ] `POST /api/tickets` - Crear ticket
- [ ] `PUT /api/tickets/[id]` - Actualizar
- [ ] `PUT /api/tickets/[id]/status` - Cambiar estado (drag&drop)
- [ ] `DELETE /api/tickets/[id]` - Eliminar

---

## 📊 RESUMEN NUMÉRICO

### Completado
- ✅ 6 modelos Prisma
- ✅ 4 enums
- ✅ 5 endpoints Clientes
- ✅ 1 vista completa (Clientes listado - 259 líneas)

### Pendiente
- ⏳ 3 vistas Clientes (~1,500 líneas)
- ⏳ 6 endpoints Cotizaciones
- ⏳ 2 vistas Inventario (~750 líneas)
- ⏳ 7 endpoints Inventario
- ⏳ 1 vista Tickets (~450 líneas)
- ⏳ 5 endpoints Tickets

**Total estimado pendiente:** ~2,700 líneas de código + 18 endpoints

---

## 🎯 RECOMENDACIÓN

Dado el alcance extenso del Sprint 3, sugiero dos opciones:

### Opción A: Implementación Completa (Estimación: 4-6 horas)
Implementar todas las 7 vistas restantes + 18 endpoints de forma completa y funcional.

### Opción B: Implementación Priorizada (Estimación: 2-3 horas)
1. **Prioridad Alta:**
   - Vista 2 Clientes: Multiagregado (necesaria para flujo)
   - Módulo Inventario completo (2 vistas + endpoints)
   - Módulo Tickets Kanban (1 vista + endpoints)
   
2. **Prioridad Media:**
   - Vista 3 Clientes: Nueva Cotización
   - Vista 4 Clientes: Detalle Cotización
   - Endpoints Cotizaciones

---

## 🔄 PRÓXIMOS PASOS

1. **Ejecutar migración Prisma:**
   ```bash
   npx prisma migrate dev --name sprint_3_clients_inventory_tickets
   npx prisma generate
   ```

2. **Continuar implementación según prioridad elegida**

3. **Ejecutar `npm run build` para verificar 0 errores**

4. **Actualizar seed.ts con datos de prueba para Sprint 3**

---

**¿Cómo deseas proceder?**
- ¿Implementar todo el Sprint 3 completo?
- ¿Priorizar módulos específicos?
- ¿Ajustar el alcance?
