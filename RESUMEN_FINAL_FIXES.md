# RESUMEN FINAL DE FIXES - KOSMOS CRM

## ✅ COMPLETADOS (4/13)

1. **Upload 413 Errors** - Vercel config actualizado
2. **Dashboard ANO → AÑO** - Label corregido
3. **WebSocket Notifications** - Polling fallback en producción
4. **Solicitudes Layout** - Navbar visible, botón normal

---

## 🔧 IMPLEMENTACIÓN PENDIENTE (9/13)

### CRÍTICOS - Requieren Refactor Completo

#### 5. Gastos Module - Inline CRUD
**Complejidad:** ALTA - Refactor completo necesario
**Archivos:**
- `src/app/(dashboard)/gastos/page.tsx` (refactor completo)
- `src/app/api/expenses/route.ts`
- `src/app/api/expenses/[id]/route.ts`

**Cambios necesarios:**
- Convertir de modal popup a inline CRUD (como inventario)
- Agregar editingRows state para edición inline
- Agregar draftRows state para nuevos gastos
- Implementar inline save/cancel/delete
- Fix detail view que no funciona
- Fix status change que no funciona
- Fix create que no funciona
- Agregar notificaciones a usuarios asignados

**Estimado:** 2-3 horas de trabajo

---

#### 6. Solicitudes de Compra - Submit & Notifications
**Complejidad:** MEDIA
**Archivos:**
- `src/app/(dashboard)/solicitudes-compra/nueva/page.tsx`
- `src/app/api/purchase-requests/route.ts`

**Cambios necesarios:**
- Fix handleSubmit que no hace nada
- Verificar API endpoint POST funciona correctamente
- Agregar notificaciones a admins de la empresa
- Agregar notificaciones a usuarios asignados

**Estimado:** 1 hora

---

#### 7. Cotizaciones - Multiple Fixes
**Complejidad:** ALTA
**Archivos:**
- `src/app/(dashboard)/clientes/cotizacion/nueva/page.tsx`
- `src/app/(dashboard)/clientes/cotizacion/[id]/editar/page.tsx`
- `src/app/(dashboard)/clientes/[id]/page.tsx`
- Buscar archivo con filtro prefilled

**Cambios necesarios:**
- Reemplazar campo DESCRIPCIÓN con ProductAutocomplete
- Agregar opción de crear producto inline sin salir de la vista
- Remover cliente cmo94k33l0001a6pkcavfd5re del filtro inicial
- Fix query en detalle de cliente para mostrar TODAS las cotizaciones (no solo última)
- Agregar notificaciones a usuarios asignados

**Estimado:** 2 horas

---

### MEDIOS - Fixes Rápidos

#### 8. Pipeline de Ventas - Edit Button
**Complejidad:** BAJA
**Archivos:**
- `src/app/(dashboard)/pipeline-ventas/page.tsx`

**Cambios necesarios:**
- Remover botón "Editar" redundante
- Mantener solo edit directo en card
- Agregar notificaciones en create/update

**Estimado:** 30 minutos

---

#### 9. Inventario - Category & Import
**Complejidad:** MEDIA
**Archivos:**
- `src/app/(dashboard)/inventario/page.tsx`

**Cambios necesarios:**
- Agregar opción para crear categorías inline (modal o input)
- Fix validación de import: "No se encontraron filas válidas"
- Revisar columnas esperadas vs columnas en template

**Estimado:** 1 hora

---

#### 10. Recursos Humanos - Enhancement
**Complejidad:** ALTA
**Archivos:**
- `src/app/(dashboard)/recursos-humanos/page.tsx`
- `public/templates/plantilla-empleados.xlsx`

**Cambios necesarios:**
- Expandir template de 5-10 campos a 20 campos
- Agregar vista de detalle con historial al hacer click en tarjeta
- Crear 20 empleados de ejemplo en template
- Clarificar función "VER ARCHIVO"
- Mostrar historial de pagos, vacaciones, etc.

**Estimado:** 2-3 horas

---

## ESTRATEGIA DE IMPLEMENTACIÓN

### Fase 1 - Commit Actual (COMPLETADO)
- ✅ Upload 413
- ✅ Dashboard AÑO
- ✅ WebSocket polling
- ✅ Solicitudes layout

### Fase 2 - Fixes Rápidos (1-2 horas)
1. Pipeline edit button (30 min)
2. Solicitudes submit + notifications (1 hora)
3. Inventario category + import (1 hora)

### Fase 3 - Refactors Complejos (4-6 horas)
1. Cotizaciones product selector + fixes (2 horas)
2. Gastos inline CRUD (2-3 horas)
3. RRHH enhancement (2-3 horas)

---

## NOTAS IMPORTANTES

### Notificaciones en CRUDs
Todos los módulos deben generar notificaciones a usuarios asignados:
- Solicitudes de Compra → Admins de empresa
- Cotizaciones → Usuario asignado
- Pipeline → Usuario asignado
- Gastos → Usuario asignado (si aplica)

### Patrón de Notificaciones
```typescript
// Crear notificación
await prisma.notification.create({
  data: {
    userId: assignedUserId,
    title: 'Nueva Solicitud de Compra',
    message: `Se creó solicitud ${requestNumber}`,
    type: 'ASSIGNMENT',
    link: `/solicitudes-compra/${id}`,
    companyId: companyId
  }
})
```

### Inline CRUD Pattern (Gastos)
Seguir patrón de inventario:
- editingRows: Record<string, EditingExpense>
- draftRows: Record<string, DraftExpense>
- handleEdit, handleSave, handleCancel, handleDelete
- Enter para guardar, Escape para cancelar
- Ctrl+Delete para eliminar

---

## COMANDO PARA PRÓXIMO COMMIT

```bash
git add .
git commit -m "Fix: Pipeline, Solicitudes submit, Inventario category/import

- Pipeline: Removed redundant edit button
- Solicitudes: Fixed submit and added admin notifications
- Inventario: Added inline category creation and fixed import validation

Fixes 7/13 critical issues"
git push
```

---

## ESTIMADO TOTAL DE TRABAJO PENDIENTE

- **Fixes rápidos:** 2-3 horas
- **Refactors complejos:** 4-6 horas
- **Total:** 6-9 horas de desarrollo

## PRIORIDAD DE USUARIO

Según reporte, los más críticos son:
1. Notificaciones (RESUELTO con polling)
2. Gastos CRUD (PENDIENTE - refactor completo)
3. Solicitudes submit (PENDIENTE - 1 hora)
4. Cotizaciones product selector (PENDIENTE - 2 horas)

**Recomendación:** Implementar fixes rápidos primero (Fase 2), luego refactors complejos (Fase 3)
