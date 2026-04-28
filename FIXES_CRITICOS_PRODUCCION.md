# FIXES CRÍTICOS DE PRODUCCIÓN - KOSMOS CRM

## PROBLEMAS REPORTADOS Y SOLUCIONES

### 1. ❌ Dashboards y KPIs Básicos
**Problema**: No se ven dashboards avanzados ni KPIs detallados
**Solución**: Verificar y extender KPIs en módulos principales
**Archivos**: `/dashboards`, `/tickets-soporte`, `/solicitudes-compra`

### 2. ❌ Notificaciones de Aprobación de Cotizaciones
**Problema**: No genera notificación cuando cotización requiere aprobación
**Solución**: Agregar notificación automática al crear cotización que requiera aprobación
**Archivo**: `src/app/api/quotes/route.ts`

### 3. ❌ Marketing - Upload de Evidencia a Supabase
**Problema**: Evidencias no se suben a Supabase
**Solución**: Verificar `/api/upload` funciona correctamente
**Status**: Código existe y usa `/api/upload`, verificar API

### 4. ❌ Inventario - Categorías y Margen Automático
**Problemas**:
- No hay opción para editar/agregar categorías
- Campo "UNI/KG" confuso
- Dropdown de categorías vacío
- Margen debe calcularse automáticamente
**Solución**: 
- Agregar CRUD de categorías
- Cambiar "UNI/KG" a "Unidad de Medida"
- Calcular margen = ((precioVenta - costo) / costo) * 100

### 5. ❌ Solicitudes de Compra - No 100% Funcional
**Falta**:
- Campos completos del encabezado
- Detalle de productos con todos los campos
- KPIs específicos
- Flujo completo de aprobación
**Solución**: Verificar schema y UI tienen todos los campos

### 6. ❌ RRHH - Employees API 500 Error
**Problema**: GET /api/employees?companyId=company-extel 500
**Solución**: ✅ CORREGIDO - Mejorado manejo de errores

### 7. ❌ RRHH - Validación de Datos
**Problema**: POST /api/employees 400 sin detalles
**Solución**: ✅ CORREGIDO - Ahora muestra campos específicos inválidos

### 8. ❌ RRHH - Import de Empleados
**Problema**: Plantilla descargada no se puede reimportar (omitido 10, cargado 0)
**Solución**: Verificar formato de plantilla vs schema de importación

### 9. ❌ RRHH - Ver Documentos/Perfil de Empleado
**Problema**: No abre nada al hacer clic
**Solución**: Agregar página de detalle de empleado

### 10. ❌ RRHH - Planillas Bulk Delete
**Problema**: Eliminar uno por uno es lento
**Solución**: Agregar selección múltiple y acciones en bulk

### 11. ❌ Tickets - KPIs Faltantes
**Faltan**:
- Tiempo promedio de respuesta
- Tiempo promedio de solución
- Tickets por técnico
- Tickets reabiertos
- Problemas más frecuentes
- Equipos con más fallas
- Clientes con más incidencias
**Solución**: Crear `/api/tickets/kpis` y dashboard

---

## PRIORIDAD DE EJECUCIÓN

1. ✅ Employees API errors (COMPLETADO)
2. 🔄 Marketing evidence upload verification
3. 🔄 Inventory categories + auto margin
4. 🔄 Purchase requests verification
5. 🔄 Quote approval notifications
6. 🔄 Employee import/detail view
7. 🔄 Payroll bulk actions
8. 🔄 Tickets KPIs
9. 🔄 Dashboards KPIs enhancement
