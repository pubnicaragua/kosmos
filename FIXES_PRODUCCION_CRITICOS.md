# FIXES CRÍTICOS DE PRODUCCIÓN

## ✅ COMPLETADOS

### 1. Gastos Detail Page Crash (React Error #31)
- **Problema:** Error al renderizar objeto `company` 
- **Solución:** Corregido interface para `company: { name: string }` y renderizado con `expense?.company?.name`
- **Archivo:** `src/app/(dashboard)/finanzas/gastos/[id]/page.tsx`

### 2. Gastos Edit/Delete/Status Buttons
- **Problema:** No había botones para editar, eliminar o cambiar estado
- **Solución:** Agregados botones Edit, Delete y dropdown de Status con funcionalidad completa
- **Archivo:** `src/app/(dashboard)/finanzas/gastos/[id]/page.tsx`

---

## ⚠️ PENDIENTES (ORDEN DE PRIORIDAD)

### 3. Gastos Bulk Edit (Multi-Select)
- **Problema:** No se pueden editar múltiples gastos simultáneamente
- **Solución Requerida:**
  - Agregar checkboxes en lista de gastos
  - Botón "Editar seleccionados" 
  - Modal para cambio masivo de estado/categoría
- **Archivos:** `src/app/(dashboard)/finanzas/gastos/page.tsx`

### 4. Clientes Import Template
- **Problema:** No hay plantilla descargable con ejemplos
- **Solución Requerida:**
  - Botón "Descargar Plantilla"
  - Excel con 5 ejemplos reales de clientes
  - Todos los campos requeridos
- **Archivos:** `src/app/(dashboard)/clientes/page.tsx`

### 5. Pipeline Notificaciones
- **Problema:** No se envían notificaciones al asignar usuarios en oportunidades
- **Solución Requerida:**
  - Crear notificación cuando se asigna usuario
  - Enviar a usuario asignado
- **Archivos:** `src/app/api/opportunities/route.ts`, `src/app/api/opportunities/[id]/route.ts`

### 6. Marketing Campaign Edit Validation
- **Problema:** Error 400 "Expected number, received null" al editar campaña
- **Solución Requerida:**
  - Hacer campos opcionales en validación Zod
  - Permitir null en budget, reach, conversions
- **Archivos:** `src/app/api/marketing/[id]/route.ts`

### 7. Marketing Evidence Upload/Display
- **Problema:** 
  - Error 400 al crear campaña con evidencia
  - Evidencia no se muestra en detalle
- **Solución Requerida:**
  - Corregir validación de evidence en POST
  - Mostrar evidencia en modal de detalle
- **Archivos:** `src/app/api/marketing/route.ts`, `src/app/(dashboard)/marketing/page.tsx`

### 8. Inventario Import Validation
- **Problema:** "No se encontraron filas válidas" al importar plantilla descargada
- **Solución Requerida:**
  - Revisar detección de columnas (case-insensitive)
  - Aceptar variaciones: Nombre/nombre, Producto/producto, etc.
- **Archivos:** `src/app/api/products/import/route.ts`

### 9. Solicitudes Approval Workflow
- **Problema:** Falta workflow completo de aprobación
- **Solución Requerida:**
  - Asignar usuarios aprobadores
  - Notificaciones a aprobadores
  - Botones: Aprobar, Rechazar
  - Estados: Pendiente → Aprobada → Compra Ejecutada → Productos Recibidos
  - Upload de cotización, OC, evidencia recepción
- **Archivos:** 
  - `prisma/schema.prisma` (agregar campos)
  - `src/app/api/purchase-requests/*`
  - `src/app/(dashboard)/solicitudes-compras/page.tsx`

### 10. Tickets Video Upload 413
- **Problema:** Error 413 al subir video de 9 segundos
- **Solución Requerida:**
  - Aumentar límite de upload en Vercel
  - Configurar `maxDuration` en vercel.json
  - Aumentar `bodyParser` limit
- **Archivos:** `vercel.json`, `next.config.js`

### 11. RRHH Import + Template
- **Problema:** 
  - No hay opción de importar empleados
  - Template solo tiene 1 empleado (necesita 10)
  - Falta opción "crear como gasto"
- **Solución Requerida:**
  - Botón "Importar Empleados"
  - Template con 10 empleados ejemplo
  - Checkbox "Crear planilla como gasto"
- **Archivos:** 
  - `src/app/(dashboard)/recursos-humanos/page.tsx`
  - `public/templates/empleados_template.xlsx`

### 12. Departamentos en Ajustes
- **Problema:** No existe sección de Departamentos
- **Solución Requerida:**
  - Nueva sección "Departamentos" en Ajustes
  - CRUD de departamentos
  - Asignar roles/usuarios a departamentos
  - Usar para notificaciones de Solicitudes de Compra
- **Archivos:**
  - `prisma/schema.prisma` (modelo Department)
  - `src/app/api/departments/*`
  - `src/app/(dashboard)/sistema/ajustes/page.tsx`

---

## 🎯 PLAN DE EJECUCIÓN

1. ✅ Gastos detail crash + edit/delete/status (COMPLETADO)
2. Commit cambios actuales
3. Implementar fixes 3-8 (rápidos, sin schema changes)
4. Commit fixes 3-8
5. Implementar fixes 9, 12 (requieren schema changes)
6. Migración Prisma
7. Commit final
8. Deploy a producción

---

## 📝 NOTAS IMPORTANTES

- Usuario reportó que import de clientes omite 1 registro "ya existe" - esto es correcto, es validación de duplicados
- Todos los fixes deben ser pragmáticos y funcionales
- Priorizar funcionalidad sobre perfección
- Testing manual en producción después de deploy
