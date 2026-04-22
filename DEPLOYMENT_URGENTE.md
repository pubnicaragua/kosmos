# DEPLOYMENT URGENTE - FIXES CRÍTICOS

## ⚠️ PROBLEMA PRINCIPAL: SERVIDOR NECESITA PRISMA GENERATE

**Todos los errores 500 en Employee API se deben a que el servidor NO tiene el cliente Prisma actualizado.**

### 🚀 EJECUTAR EN SERVIDOR AHORA MISMO:

```bash
ssh extel@186.1.56.251 -p 1510
cd ~/kosmos
git pull origin main
npx prisma generate
npm run build
pm2 restart kosmos-crm
pm2 logs kosmos-crm --lines 50
```

---

## ✅ FIXES YA IMPLEMENTADOS EN CÓDIGO

### 1. Marketing Validation Null Errors - RESUELTO ✅
**Archivo:** `src/app/(dashboard)/marketing/[id]/page.tsx`
**Fix:** Envía `null` en lugar de strings vacías para budget/spent/dates
**Líneas:** 151-154

### 2. Employee Import Template 10 Ejemplos - RESUELTO ✅
**Archivo:** `src/app/(dashboard)/recursos-humanos/page.tsx`
**Fix:** Template con 10 empleados ejemplo completos
**Líneas:** 310-319

### 3. Inventario Import Case-Insensitive - RESUELTO ✅
**Archivo:** `src/app/api/products/import/route.ts`
**Fix:** Detección case-insensitive de columnas (Nombre/nombre, SKU/sku, etc.)

---

## ❌ PROBLEMAS QUE REQUIEREN IMPLEMENTACIÓN COMPLETA

### 1. SOLICITUDES DE COMPRA - NO OPERATIVO
**Estado:** Módulo incompleto, requiere desarrollo extenso

**Requerimientos faltantes:**
- [ ] Workflow de aprobación completo
- [ ] Asignación de usuarios aprobadores por departamento
- [ ] Notificaciones a aprobadores
- [ ] Botón "Aprobar" solo visible para usuarios asignados
- [ ] Estados: Pendiente → Aprobada → Cotizada → OC Generada → Ejecutada → Recibida
- [ ] Upload de cotización en detalle kanban
- [ ] Upload de Orden de Compra
- [ ] Upload de evidencia de producto recibido
- [ ] Actualización automática de inventario al marcar "Recibido"
- [ ] Indicadores: productos con stock bajo, top 20 vendidos, sin rotación 90 días
- [ ] Métricas de tiempo promedio de reposición por proveedor

**Estimación:** 4-6 horas de desarrollo

### 2. DEPARTAMENTOS EN AJUSTES - NO EXISTE
**Estado:** Vista completa faltante

**Requerimientos:**
- [ ] Nueva sección "Departamentos" en Ajustes
- [ ] CRUD completo de departamentos
- [ ] Asignar roles a departamentos
- [ ] Asignar usuarios a departamentos
- [ ] Integración con notificaciones de Solicitudes de Compra

**Estimación:** 2-3 horas de desarrollo

### 3. GASTOS BULK EDIT/DELETE - NO EXISTE
**Estado:** Funcionalidad faltante en vista principal

**Requerimientos:**
- [ ] Checkboxes para seleccionar múltiples gastos
- [ ] Botón "Seleccionar todos"
- [ ] Botón "Eliminar seleccionados" con confirmación
- [ ] Botón "Editar seleccionados" (campos comunes: estado, categoría, método)
- [ ] Modal de edición masiva
- [ ] API endpoint para bulk update/delete

**Estimación:** 2-3 horas de desarrollo

---

## 📊 RESUMEN DE ESTADO

| Problema | Estado | Acción Requerida |
|----------|--------|------------------|
| Employee API 500 | ⚠️ Servidor | `npx prisma generate` en servidor |
| Marketing validation | ✅ Resuelto | Ya en código, hacer push |
| Marketing evidence | ✅ Funciona | Ya implementado correctamente |
| Employee template 10 | ✅ Resuelto | Ya en código, hacer push |
| Inventario import | ✅ Resuelto | Ya en código, hacer push |
| Solicitudes workflow | ❌ Falta | Desarrollo completo requerido |
| Departamentos Ajustes | ❌ Falta | Desarrollo completo requerido |
| Gastos bulk edit | ❌ Falta | Desarrollo completo requerido |

---

## 🎯 DECISIÓN REQUERIDA

**Opción A:** Hacer push AHORA de los 3 fixes completados
- ✅ Marketing validation
- ✅ Employee template 10 ejemplos
- ✅ Inventario import case-insensitive
- ⚠️ Luego ejecutar prisma generate en servidor
- ❌ Solicitudes, Departamentos y Gastos bulk quedan pendientes

**Opción B:** Completar TODOS los módulos faltantes (8-12 horas más)
- Implementar Solicitudes workflow completo
- Implementar Departamentos en Ajustes
- Implementar Gastos bulk edit/delete
- Un solo push con todo 100% funcional

---

## 📝 NOTAS IMPORTANTES

1. **Marketing Evidence:** Ya funciona correctamente. Si no se ve evidencia, es porque el campo `evidenceUrl` está vacío en la BD.

2. **Pipeline Notifications:** Ya funcionan correctamente desde commit anterior.

3. **Tickets Video 413:** Límite ya configurado en 100MB en `next.config.js`.

4. **Solicitudes de Compra:** Es el módulo más complejo y crítico. Requiere:
   - Nuevo modelo Prisma para Departamentos
   - Migración de BD
   - API completa de aprobaciones
   - Sistema de notificaciones
   - Integración con inventario

---

## ⏰ TIEMPO ESTIMADO TOTAL

- **Deployment actual:** 5 minutos
- **Solicitudes workflow:** 4-6 horas
- **Departamentos:** 2-3 horas
- **Gastos bulk:** 2-3 horas
- **TOTAL:** 8-12 horas de desarrollo adicional
