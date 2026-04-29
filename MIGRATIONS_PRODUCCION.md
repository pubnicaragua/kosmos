# Migraciones de Prisma para Producción

Estas migraciones deben ejecutarse en el servidor de producción ya que no hay conexión local a la base de datos.

## 1. Agregar campos isInternal y hasCharge a Ticket

```sql
-- Agregar campo isInternal a la tabla tickets
ALTER TABLE "tickets" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- Agregar campo hasCharge a la tabla tickets
ALTER TABLE "tickets" ADD COLUMN "has_charge" BOOLEAN NOT NULL DEFAULT false;
```

## 2. Agregar relación createdByUser a Quote

Esta migración ya debería existir en la base de datos si se creó la relación correctamente. Si no, ejecutar:

```sql
-- La relación ya existe mediante el campo created_by que hace referencia a users.id
-- No se requiere SQL adicional, solo regenerar el cliente de Prisma
```

## Pasos para aplicar en producción

1. Conectarse al servidor via SSH:
   ```bash
   ssh extel@186.1.56.251 -p 1510
   ```

2. Navegar al directorio del proyecto:
   ```bash
   cd /ruta/al/proyecto
   ```

3. Aplicar migraciones de Prisma:
   ```bash
   npx prisma migrate deploy
   ```

4. Regenerar el cliente de Prisma:
   ```bash
   npx prisma generate
   ```

5. Reiniciar la aplicación:
   ```bash
   pm2 restart kosmos-crm
   ```

## Notas

- Los campos isInternal y hasCharge en tickets tienen valores por defecto, por lo que no afectarán datos existentes
- La relación createdByUser en Quote usa el campo existente created_by, solo se agregó la relación en el schema de Prisma para facilitar las consultas
- Después de las migraciones, descomentar la línea en `src/app/api/quotes/route.ts`:
  ```typescript
  createdByUser: { select: { name: true } },
  ```
