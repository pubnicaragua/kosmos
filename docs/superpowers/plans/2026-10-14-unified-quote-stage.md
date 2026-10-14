# Estado único para cotizaciones: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Usar las cinco etapas del Kanban como único estado vigente para cotizaciones.

**Architecture:** `pipelineStage` queda como estado canónico y conserva historial auditable. El estado documental anterior se renombra a campo legado interno para preservar valores, mientras aprobaciones de descuento siguen en su auditoría propia.

**Tech Stack:** Next.js, TypeScript, Prisma, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-14-unified-quote-stage.md`

## Global Constraints

- Etapas únicas: `PROSPECTO`, `PROPUESTA`, `NEGOCIACION`, `REALIZADA`, `RECHAZADA`.
- Etapa inicial: `PROSPECTO`.
- Conservar valores históricos del estado documental bajo `legacyDocumentStatus`.
- Convertir estados anteriores: `DRAFT` → `PROSPECTO`, `SENT` → `NEGOCIACION`, `APPROVED` → `REALIZADA`, `REJECTED`/`EXPIRED` → `RECHAZADA`.
- No borrar cotizaciones ni cambiar sus datos comerciales; actualizar etapa y conservar el estado anterior.
- No mostrar esqueleto al filtrar/buscar ni recargar la vista tras mover tarjeta.

## Review Focus

- Migración conserva cotizaciones y valores previos, actualiza etapas según el mapeo acordado y elimina default `DRAFT` de registros nuevos.
- API no expone estado legado como estado vigente.
- Aprobación/rechazo de descuento no altera `pipelineStage`.
- Lista y Kanban renderizan misma etapa; filtro solo en Lista.
- Búsqueda/movimiento conservan vista y auditoría actor/fecha.

### Task 1: Esquema, migración y API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261014150000_quote_single_active_stage/migration.sql`
- Modify: `src/app/api/quotes/route.ts`
- Modify: `src/app/api/quotes/[id]/route.ts`
- Modify: `src/app/api/quotes/[id]/status/route.ts`
- Modify: `src/app/api/quotes/[id]/pipeline-stage/route.ts`
- Modify: `prisma/seed.ts`
- Modify: `src/lib/quote-pipeline.ts`
- Create: `src/lib/quote-public-view.ts`

- [x] Renombrar `Quote.status`/`QuoteStatus` a legado opcional, renombrar columna/enum/índice sin borrar valores y quitar default.
- [x] Aceptar solo etapas comerciales en el filtro de cotizaciones; ocultar el campo legado en respuestas.
- [x] Mantener acciones de descuento en auditoría sin escribir estado legado ni etapa comercial.
- [x] Confirmar creación inicial en `PROSPECTO` y proteger campos de estado ante PUT genérico.

### Task 2: Vistas de cotizaciones

**Files:**
- Modify: `src/app/(dashboard)/clientes/cotizacion/page.tsx`
- Modify: `src/app/(dashboard)/clientes/cotizacion/QuoteKanban.tsx`
- Modify: `src/app/(dashboard)/clientes/cotizacion/nueva/page.tsx`
- Modify: `src/app/(dashboard)/clientes/[id]/page.tsx`

- [x] Mostrar una columna/badge de etapa comercial en Lista y ninguna etiqueta de estado documental en Kanban.
- [x] Eliminar acción Guardar borrador; creación queda en Prospecto.
- [x] Mostrar etapa vigente en la ficha del cliente.
- [x] Mantener búsqueda compartida, filtro solo en Lista y actualizaciones sin skeleton/refetch tras mover.

### Task 3: Búsqueda y métricas

**Files:**
- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/api/quotes/kpis/route.ts`
- Modify: `src/app/api/purchase-requests/stats/route.ts`

- [x] Buscar y presentar cotizaciones usando etapa comercial.
- [x] Calcular métricas de cierre, pendientes y rechazos desde las cinco etapas.
- [x] Considerar ventas de cotización solo en `REALIZADA`.

## Verificación

`npx prisma generate` ejecutado para regenerar el cliente tras el cambio de esquema. No ejecutar pruebas ni build: usuario no solicitó verificación. Informar esta limitación al entregar.
