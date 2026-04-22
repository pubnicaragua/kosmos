# COMMIT DE FIXES PARCIALES - KOSMOS CRM

## ✅ FIXES COMPLETADOS (4/13)

### 1. Upload 413 Errors - RESUELTO ✅
- **Archivo:** `vercel.json`
- **Fix:** Agregado maxDuration:60 y memory:1024 para /api/upload
- **Impacto:** Marketing y Tickets pueden subir videos grandes

### 2. Dashboard ANO → AÑO - RESUELTO ✅
- **Archivo:** `src/app/(dashboard)/dashboards/page.tsx`
- **Fix:** Cambio de label en filtro de período
- **Impacto:** Corrección ortográfica en UI

### 3. WebSocket Notifications - RESUELTO ✅
- **Archivo:** `src/components/notifications/NotificationCenter.tsx`
- **Fix:** Polling fallback automático en producción (10s interval)
- **Impacto:** Notificaciones funcionan en tiempo real en Vercel

### 4. Solicitudes de Compra Layout - RESUELTO ✅
- **Archivo:** `src/app/(dashboard)/solicitudes-compra/page.tsx`
- **Fix:** Removido max-w-full y py-6 px-8 del botón
- **Impacto:** Navbar visible, botón tamaño normal

---

## 🔧 PENDIENTES CRÍTICOS (9/13)

### 5. Gastos Module - Inline CRUD
**Prioridad:** ALTA
**Requiere:** Refactor completo del módulo
**Tareas:**
- Convertir de modal popup a inline CRUD
- Agregar editingRows/draftRows state
- Implementar inline save/cancel/delete
- Fix detail view, status change, create

### 6. Solicitudes de Compra - Submit & Notifications
**Prioridad:** ALTA
**Tareas:**
- Fix handleSubmit que no hace nada
- Agregar notificaciones a admins de empresa
- Verificar API endpoint funciona

### 7. Cotizaciones - Product Selector
**Prioridad:** ALTA
**Tareas:**
- Reemplazar campo DESCRIPCIÓN con ProductAutocomplete
- Agregar opción de crear producto inline
- Remover cliente prefiltrado cmo94k33l0001a6pkcavfd5re
- Fix query para mostrar todas las cotizaciones en detalle de cliente

### 8. Pipeline de Ventas - Edit Button
**Prioridad:** MEDIA
**Tareas:**
- Remover botón "Editar" redundante
- Agregar notificaciones en create/update

### 9. Inventario - Category & Import
**Prioridad:** MEDIA
**Tareas:**
- Agregar opción para crear categorías inline
- Fix validación de import: "No se encontraron filas válidas"

### 10. Recursos Humanos - Enhancement
**Prioridad:** MEDIA
**Tareas:**
- Expandir template a 20 campos
- Agregar vista de detalle con historial
- Crear 20 empleados de ejemplo
- Clarificar "VER ARCHIVO"

### 11-13. Notificaciones en CRUDs
**Prioridad:** ALTA
**Tareas:**
- Agregar notificaciones a usuarios asignados en:
  - Solicitudes de Compra
  - Cotizaciones
  - Pipeline de Ventas
  - Gastos

---

## PRÓXIMOS PASOS

1. **Commit actual:** Fixes 1-4 completados
2. **Siguiente sesión:**
   - Gastos inline CRUD (refactor completo)
   - Solicitudes submit + notifications
   - Cotizaciones product selector
   - Pipeline edit button
   - Inventario category + import
   - RRHH enhancement
   - Notificaciones en todos los CRUDs

## COMANDO PARA COMMIT

```bash
git add .
git commit -m "Fix: Upload 413, Dashboard AÑO, WebSocket polling, Solicitudes layout

- Vercel config: maxDuration 60s, memory 1024MB for uploads
- Dashboard: ANO → AÑO in period filter
- Notifications: Polling fallback (10s) for production (Vercel)
- Solicitudes: Fixed navbar hidden and button size

Fixes 4/13 critical issues reported"
git push
```

## NOTAS

- Los fixes de upload (1) resuelven también problemas #9 y #12
- WebSocket fix (3) es crítico para notificaciones en producción
- Solicitudes layout (4) mejora UX inmediatamente
- Pendientes requieren más trabajo pero bases están listas
