# PENDIENTES FINALES - KOSMOS CRM

## ✅ COMPLETADOS (No hacer commit aún)
1. ✅ Módulos agregados a Roles/Permisos (Notificaciones, Cotizaciones, Solicitudes de Compra)
2. ✅ Selector de rol base (USER/ADMIN/SUPER_ADMIN) agregado
3. ✅ API endpoint para cambiar roles creado
4. ✅ ClientAutocomplete arreglado para mostrar nombres en vez de IDs
5. ✅ Notificaciones optimizadas a 5 segundos

## 🔴 PENDIENTES CRÍTICOS

### 1. IDs en vez de Nombres - SOLICITUDES DE COMPRA
**Problema**: En la lista de solicitudes, "Área Solicitante" muestra el ID del departamento en vez del nombre
**Ubicación**: `src/app/(dashboard)/solicitudes-compra/page.tsx`
**Estado**: ✅ API arreglado, falta verificar frontend

### 2. IDs en vez de Nombres - TODOS LOS MÓDULOS
**Revisar**:
- ✅ Actividades (ya arreglado con ClientAutocomplete)
- ✅ Cotizaciones (ya arreglado con ClientAutocomplete)
- 🔴 Solicitudes de Compra (requestingArea) - API arreglado, verificar frontend
- 🔴 Tickets - muestra ID en vez de cliente/usuario
- 🔴 Otros módulos que usen dropdowns/autocompletes

### 3. Workflow Solicitudes de Compra - 100% Funcional
**Verificar**:
- ✅ Notificaciones a aprobadores de departamento (ya implementado)
- ✅ Notificaciones a ADMIN/SUPER_ADMIN (ya implementado)
- 🔴 Verificar que los aprobadores puedan aprobar/rechazar
- 🔴 Pasos 3-4: Subir documentos de respaldo
  - COMPRADO: Subir orden de compra, factura
  - RECIBIDO: Subir comprobante de recepción

### 4. Ordenamiento Alfabético en Buscadores
**Ubicaciones**:
- 🔴 Buscador global (Header)
- 🔴 Clientes (autocomplete y listas)
- 🔴 Cotizaciones (autocomplete de clientes)
- 🔴 Todos los autocompletes del sistema

### 5. Workflow de Cotizaciones
**Agregar**:
- 🔴 Botón "Enviar a Pipeline" (crear oportunidad desde cotización)
- 🔴 Botón "Marcar como Pagada" (convertir a ingreso automáticamente)
- 🔴 Documentar flujo completo del Pipeline

**Flujo Pipeline a documentar**:
1. Cotización → Pipeline (oportunidad)
2. Pipeline → Calificado (¿se convierte automáticamente a ingreso?)
3. ¿Se genera factura automáticamente?

### 6. Historial de Movimientos de Inventario
**Agregar**:
- 🔴 Ver justificación completa en el detalle del historial
- 🔴 Permitir subir archivos (PDF, imágenes, screenshots)
- 🔴 Mostrar archivos adjuntos en el historial

### 7. TICKETS Y SOPORTE - MEJORAS CRÍTICAS
**Problemas actuales**:
- 🔴 Campo cliente no es buscador (no funciona)
- 🔴 Muestra ID en vez de cliente/usuario relacionado
- 🔴 Falta número de ticket autogenerado

**Mejoras requeridas**:
- 🔴 Switch para ticket interno (sin cliente)
- 🔴 Tipo de solicitud: entrada manual con sugerencias (no fijas)
- 🔴 Switch para indicar si tiene cobro
- 🔴 Ver asignación en el detalle del ticket
- 🔴 Diseño tipo Trello (tarjetas bonitas, creación rápida)
- 🔴 Tarjetas con vista previa de primera imagen/evidencia
- 🔴 KPIs ya implementados en API, verificar que se muestren en frontend

**KPIs requeridos** (todos ya en API):
- ✅ Tiempo promedio de respuesta
- ✅ Tiempo promedio de solución
- ✅ Tickets por técnico
- ✅ Tickets reabiertos
- ✅ Problemas más frecuentes
- ✅ Equipos con más fallas
- ✅ Clientes con más incidencias

## 📋 ORDEN DE EJECUCIÓN (PRIORIDAD: RÁPIDOS PRIMERO)

1. ✅ Arreglar IDs en Solicitudes de Compra (requestingArea) - API DONE
2. 🔴 Implementar ordenamiento alfabético en todos los autocompletes (cambio global rápido)
3. 🔴 Arreglar IDs en Tickets (muestra ID en vez de cliente/usuario)
4. 🔴 Agregar mejoras críticas a Tickets:
   - Switch para ticket interno
   - Tipo de solicitud manual con sugerencias
   - Switch para indicar cobro
   - Número de ticket autogenerado
5. 🔴 Verificar workflow completo de Solicitudes de Compra
6. 🔴 Agregar subida de documentos en pasos 3-4 de Solicitudes de Compra
7. 🔴 Mejorar diseño de Tickets tipo Trello
8. 🔴 Agregar workflow de cotizaciones (Pipeline + Pagada)
9. 🔴 Mejorar historial de inventario con justificaciones y archivos
10. 🔴 Type-check completo
11. 🔴 Commit final

## 🎯 PRIORIDAD MÁXIMA
- Ordenamiento alfabético en autocompletes (afecta toda la UX)
- IDs → Nombres en todos lados
- Tickets mejoras críticas (buscador cliente, switch interno, etc.)
