# Estado único para cotizaciones

## Diseño aprobado

`pipelineStage` es el único estado vigente de una cotización: `PROSPECTO`, `PROPUESTA`, `NEGOCIACION`, `REALIZADA` o `RECHAZADA`. Las cotizaciones nuevas comienzan en `PROSPECTO`; Lista y Kanban leen y muestran el mismo valor.

El antiguo estado documental se conserva como `legacyDocumentStatus`, solo para resguardar datos existentes. No aparece en respuestas públicas, pantallas, filtros ni métricas. Las decisiones de descuento continúan en su auditoría independiente y no cambian la etapa comercial.

La búsqueda sigue disponible en ambas vistas; el filtro de etapa aparece solo en Lista. Consultas y movimientos mantienen la vista montada. El cambio de etapa guarda `QuoteStageHistory` con actor y fecha, y actualiza la tarjeta localmente.

Al migrar los registros existentes, el estado anterior se convierte así: `DRAFT` → `PROSPECTO`, `SENT` → `NEGOCIACION`, `APPROVED` → `REALIZADA`, `REJECTED` → `RECHAZADA` y `EXPIRED` → `RECHAZADA`. La migración actualiza solo la etapa activa, conserva la fila y los demás datos de la cotización, retiene el valor anterior en `legacyDocumentStatus` y registra en el historial los cambios realizados por la migración.

## Alcance

- Renombrar columna y enum legados con migración no destructiva.
- Quitar `Quote.status` como estado activo de esquema, APIs y vistas.
- Crear cotizaciones en Prospecto y eliminar acción Borrador.
- Usar etapas comerciales en lista, Kanban, detalle, búsqueda y métricas.
- Mantener historial de transición y auditoría de descuentos.
