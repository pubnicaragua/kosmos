# PROBLEMAS REPORTADOS EN PRODUCCIÓN - ANÁLISIS COMPLETO

## 1. ❌ EMPLOYEE API 500 ERROR
**Error:** `GET /api/employees?companyId=company-extel 500`
**Causa:** Servidor necesita `npx prisma generate` después del deploy
**Solución:** Ejecutar en servidor después de git pull

## 2. ✅ MARKETING VALIDATION NULL ERRORS - RESUELTO
**Error:** `Expected number, received null` en budget/spent/dates
**Causa:** Frontend enviaba strings vacías `""` en lugar de `null`
**Fix:** Modificado `marketing/[id]/page.tsx` para enviar `null` correctamente
**Archivo:** `src/app/(dashboard)/marketing/[id]/page.tsx` líneas 151-154

## 3. ✅ MARKETING EVIDENCE DISPLAY - YA FUNCIONA
**Estado:** La evidencia SÍ se muestra en el detalle (líneas 466-500)
**Nota:** Si no aparece, es porque `evidenceUrl` está vacío en la BD

## 4. ❌ SOLICITUDES DE COMPRA - NO OPERATIVO
**Problemas:**
- Falta workflow de aprobación completo
- Falta asignación de usuarios aprobadores
- Falta notificaciones a aprobadores
- Falta botón "Aprobar" solo para usuarios asignados
- Falta seguimiento: Compra Ejecutada → Productos Recibidos
- Falta subir cotización/OC/evidencia en detalle kanban
- Falta actualización automática de inventario al recibir

## 5. ❌ DEPARTAMENTOS EN AJUSTES - NO EXISTE
**Falta:** Vista completa de Departamentos en Ajustes
**Requerido:**
- CRUD de departamentos
- Asignar roles/usuarios a departamentos
- Usar para notificaciones de solicitudes de compra

## 6. ❌ GASTOS BULK EDIT/DELETE - NO EXISTE
**Falta:** Edición y eliminación múltiple desde vista principal
**Requerido:**
- Checkboxes para seleccionar múltiples gastos
- Botón "Eliminar seleccionados"
- Botón "Editar seleccionados" (campos comunes)

## 7. ❌ EMPLOYEE IMPORT TEMPLATE - NO TIENE 10 EJEMPLOS
**Problema:** Template solo tiene 1 empleado, se pidieron 10
**Estado:** YA IMPLEMENTADO en código (líneas 310-319 de recursos-humanos/page.tsx)
**Nota:** Servidor necesita actualización

---

## RESUMEN DE ACCIONES NECESARIAS

### INMEDIATO (Servidor)
```bash
cd ~/kosmos
git pull origin main
npx prisma generate
npm run build
pm2 restart kosmos-crm
```

### CÓDIGO PENDIENTE
1. ✅ Marketing validation - RESUELTO
2. ❌ Solicitudes workflow completo
3. ❌ Departamentos en Ajustes
4. ❌ Gastos bulk edit/delete
5. ✅ Employee template 10 ejemplos - YA EN CÓDIGO

### PRIORIDAD CRÍTICA
**Solicitudes de Compra** es el módulo más crítico y requiere:
- Workflow de aprobación completo
- Notificaciones
- Seguimiento de estados
- Integración con inventario
