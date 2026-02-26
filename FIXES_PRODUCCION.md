# Correcciones de Producción - KOSMOS CRM

## Estado Actual
✅ Base de datos actualizada - tabla `ticket_comments` creada
✅ Prisma Client regenerado
✅ API `/api/tickets/[id]/comments` creada para comentarios

## Problemas Reportados y Soluciones

### 1. ❌ Roles Predefinidos No Aparecen
**Estado:** El API `/api/roles` ya retorna `predefinedRoles` en línea 103
**Acción:** Verificar frontend que consume este endpoint

### 2. ❌ Permisos por Módulo Vacíos
**Estado:** El API retorna `modules` array en línea 103
**Acción:** Verificar componente de roles en frontend

### 3. ❌ Actividades - Sidebar No Visible
**Acción Requerida:** Revisar layout de página de actividades

### 4. ❌ Clientes - Validación Requerida
**Campos a validar:**
- Contacto (requerido)
- Correo (requerido)
- Cédula: Patrón Nicaragua (000-000000-0000X)
- RUC: Patrón Nicaragua (J0310000000000)

### 5. ❌ Marketing - Métricas y Evidencias
**Faltante:**
- Display de métricas en formulario
- Workflow de aprobación de evidencias
- Notificaciones a SUPER_ADMIN

### 6. ❌ Marketing - Soporte de Moneda
**Acción:** Agregar campo currency (C$ o USD)

### 7. ✅ Tickets - Comentarios y Adjuntos
**Estado:** API creada en `/api/tickets/[id]/comments`
**Pendiente:** Verificar integración frontend

### 8. ❌ Upload - Error 500
**Acción:** Revisar logs del servidor en producción

### 9. ❌ Usuario Aparece como ADMIN en vez de SUPER_ADMIN
**Acción:** Revisar lógica de display de roles en Header/Sidebar

## Próximos Pasos
1. Validación de clientes con patrones Nicaragua
2. Sidebar de actividades
3. Marketing: métricas y aprobaciones
4. Pipeline personalizable por usuario
5. Verificar upload en producción
