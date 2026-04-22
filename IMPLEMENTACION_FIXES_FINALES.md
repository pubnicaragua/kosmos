# IMPLEMENTACIÓN DE FIXES FINALES - KOSMOS CRM

## ESTADO ACTUAL

### ✅ COMPLETADOS
1. **Upload 413 Errors** - Vercel config actualizado con maxDuration y memory
2. **Dashboard ANO → AÑO** - Label corregido en filtro de período

### 🔧 EN PROGRESO

## PROBLEMAS PENDIENTES Y PLAN DE IMPLEMENTACIÓN

### CRÍTICO - WebSocket Notifications
**Problema:** WSS connection failing en producción
**Causa:** Vercel no soporta WebSocket nativo
**Solución:** 
- Implementar polling fallback automático
- Mantener WebSocket para desarrollo
- Usar Server-Sent Events o polling en producción

### CRÍTICO - Gastos Module
**Problemas:**
- Detail view no funciona
- Status change no funciona  
- Create no funciona
- Modal popup en vez de inline CRUD

**Solución:** Refactor completo a inline CRUD como inventario
- Agregar editingRows state
- Agregar draftRows para nuevos gastos
- Implementar inline save/cancel/delete
- Remover modal popup

### CRÍTICO - Solicitudes de Compra
**Problemas:**
- Enviar solicitud no hace nada
- No genera notificaciones
- Navbar oculto
- Botón muy grande

**Solución:**
- Fix handleSubmit function
- Agregar notificación a admins de la empresa
- Corregir layout classes
- Ajustar tamaño de botón

### ALTO - Cotizaciones
**Problemas:**
- Campo DESCRIPCIÓN en vez de selector de productos
- Cliente cmo94k33l0001a6pkcavfd5re prefiltrado
- Solo muestra última cotización en detalle de cliente

**Solución:**
- Reemplazar campo descripción con ProductAutocomplete
- Agregar opción de crear producto inline
- Remover filtro inicial de cliente
- Fix query para listar todas las cotizaciones

### MEDIO - Pipeline de Ventas
**Problema:** Botón "Editar" redundante
**Solución:** Remover botón, mantener solo edit directo en card

### MEDIO - Inventario
**Problemas:**
- No hay opción para crear categorías inline
- Import falla: "No se encontraron filas válidas"

**Solución:**
- Agregar modal/input para crear categoría
- Fix validación de columnas en import

### MEDIO - Recursos Humanos
**Problemas:**
- "VER ARCHIVO" no claro
- Funcionalidad básica
- Template con pocos datos

**Solución:**
- Expandir template a 20 campos
- Agregar vista de detalle con historial
- Crear 20 empleados de ejemplo

## ORDEN DE IMPLEMENTACIÓN

1. **WebSocket Notifications** (CRÍTICO) - Afecta todo el sistema
2. **Gastos Module** (CRÍTICO) - Refactor completo
3. **Solicitudes de Compra** (CRÍTICO) - Submit + notificaciones
4. **Cotizaciones** (ALTO) - Product selector + fixes
5. **Pipeline** (MEDIO) - Quick fix
6. **Inventario** (MEDIO) - Category + import
7. **Recursos Humanos** (MEDIO) - Enhancement

## NOTAS IMPORTANTES

- Todos los CRUDs deben generar notificaciones a usuarios asignados
- Mantener consistencia en diseño inline CRUD
- Verificar que notificaciones funcionen en tiempo real
- Testing exhaustivo después de cada fix

## ARCHIVOS A MODIFICAR

### WebSocket
- `src/components/notifications/NotificationCenter.tsx`

### Gastos
- `src/app/(dashboard)/gastos/page.tsx`
- `src/app/api/expenses/route.ts`
- `src/app/api/expenses/[id]/route.ts`

### Solicitudes de Compra
- `src/app/(dashboard)/solicitudes-compra/page.tsx`
- `src/app/api/purchase-requests/route.ts`

### Cotizaciones
- `src/app/(dashboard)/clientes/cotizacion/[id]/editar/page.tsx`
- `src/app/(dashboard)/clientes/cotizacion/nueva/page.tsx`
- `src/app/(dashboard)/clientes/[id]/page.tsx`

### Pipeline
- `src/app/(dashboard)/pipeline-ventas/page.tsx`

### Inventario
- `src/app/(dashboard)/inventario/page.tsx`

### Recursos Humanos
- `src/app/(dashboard)/recursos-humanos/page.tsx`
- `public/templates/plantilla-empleados.xlsx`
