# Plan: eliminación global de usuarios con historial preservado

## Objetivo

Permitir que un SUPER_ADMIN elimine globalmente la cuenta y sus credenciales, liberar el correo electrónico y conservar los registros de negocio y la atribución histórica bajo una identidad mínima archivada. La desactivación existente seguirá disponible como acción distinta. No ejecutar migraciones en VPS.

## Task 1: Esquema e identidad archivada
   - Añadir `ArchivedUser` con el ID anterior, nombre final, fecha de eliminación y actor que eliminó la cuenta. No almacenar correo, contraseña ni avatar.
   - Mantener `UserNameHistory` sin borrar sus filas. Antes de eliminar, crear la versión inicial si la cuenta aún no tiene historial.
   - Quitar las relaciones con `User` que bloquean la eliminación o borrarían historial: `Quote.createdByUser`, `Template.user` y `TicketComment.user`. Mantener los IDs de autor como texto.
   - Crear migración SQL que cree el archivo de identidad y quite únicamente esas claves foráneas; no alterar ni borrar filas de negocio.

## Task 2: Servicio transaccional de eliminación
   - Añadir operación en `src/lib/user-lifecycle.ts` que valide actor SUPER_ADMIN activo, impida autoeliminación y proteja al último SUPER_ADMIN activo.
   - En una transacción serializable, archivar identidad, limpiar datos exclusivos de cuenta (sesiones/tokens, preferencias, notificaciones, suscripciones push y membresías) y eliminar la fila `User`.
   - Conservar cotizaciones, plantillas, comentarios, asignaciones, ejecuciones, auditorías, cambios de etapa y demás datos de negocio con IDs históricos.

## Task 3: API y pantalla de usuarios
   - Añadir `DELETE /api/users/[id]`, separado del `GET/POST /api/users/[id]/offboard` que mantiene desactivación reversible.
   - En `sistema/ajustes/page.tsx`, ofrecer acción clara “Eliminar globalmente” con confirmación explícita de irreversibilidad, correo liberado y conservación de historial.
   - Refrescar lista/permisos tras eliminar. Mantener la acción de cerrar membresía en una sola empresa separada de ambas acciones globales.

## Task 4: Lectura de autoría histórica
   - Extender `resolveHistoricalUserNames` para resolver por `UserNameHistory` y usar `ArchivedUser` como respaldo de identidad.
   - Ajustar respuestas de cotizaciones, comentarios, auditoría de tickets y asignaciones de tareas para devolver nombre histórico aunque ya no exista `User`; conservar una forma de respuesta compatible con la UI.

## Task 5: Revisión local
   - Revisar el diff para confirmar que la migración solo crea la tabla de archivo y elimina las tres claves foráneas indicadas.
   - Ejecutar validación de Prisma, generación del cliente y comprobación estática de TypeScript/build disponibles en el proyecto.
   - No ejecutar suites de pruebas, aplicar migración contra ninguna base de datos, ni conectarse al VPS.

## Archivos previstos

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_archive_deleted_users/migration.sql`
- `src/lib/user-lifecycle.ts`
- `src/lib/user-name-history.ts`
- `src/app/api/users/[id]/route.ts` (nuevo)
- `src/app/(dashboard)/sistema/ajustes/page.tsx`
- `src/app/api/quotes/route.ts`
- `src/app/api/quotes/[id]/route.ts`
- `src/app/(dashboard)/clientes/cotizacion/[id]/page.tsx`
- `src/app/api/tickets/[id]/comments/route.ts`
- `src/app/api/tickets/[id]/audit/route.ts`
- `src/app/api/task-assignments/route.ts`
- `src/app/api/task-assignments/[id]/route.ts`

## Riesgo conocido

El historial conserva nombres disponibles desde `UserNameHistory`; para cuentas sin historial, la eliminación guardará el nombre actual como versión inicial. Cambios de nombre anteriores a la captura de historial no se pueden reconstruir.
