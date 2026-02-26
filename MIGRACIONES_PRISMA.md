# 🔒 Guía de Migraciones Prisma - PREVENIR PÉRDIDA DE DATOS

## ⚠️ IMPORTANTE: Nunca más perder datos

### ❌ NO USAR `prisma db push` en producción o con datos importantes

`prisma db push` **elimina y recrea tablas**, lo que causa **pérdida de datos**.

### ✅ USAR `prisma migrate dev` para desarrollo

```bash
# 1. Hacer cambios en schema.prisma
# 2. Crear migración con nombre descriptivo
npx prisma migrate dev --name add_custom_roles

# Esto crea:
# - Un archivo SQL en prisma/migrations/
# - Aplica la migración a la DB
# - Regenera Prisma Client
```

### ✅ USAR `prisma migrate deploy` para producción

```bash
# En el servidor de producción
npx prisma migrate deploy

# Esto:
# - Aplica SOLO las migraciones pendientes
# - NO elimina datos
# - Es seguro para producción
```

## 📋 Flujo de Trabajo Correcto

### Desarrollo Local

1. Editar `prisma/schema.prisma`
2. Crear migración: `npx prisma migrate dev --name descripcion_cambio`
3. Verificar que la migración se creó en `prisma/migrations/`
4. Hacer commit de:
   - `prisma/schema.prisma`
   - `prisma/migrations/XXXXXX_descripcion_cambio/migration.sql`

### Despliegue a Producción

1. `git pull origin main` en el servidor
2. `npx prisma migrate deploy` (NO `db push`)
3. `npm run build`
4. `pm2 restart kosmos-crm`

## 🚨 Recuperación de Emergencia

Si ya usaste `prisma db push` y perdiste datos:

1. **Restaurar desde backup de PostgreSQL** (si existe)
2. **Recrear datos manualmente** usando las APIs o interfaces
3. **En el futuro**: Hacer backups regulares de PostgreSQL

### Crear Backup de PostgreSQL

```bash
# Backup
pg_dump -U postgres -d kosmos_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar
psql -U postgres -d kosmos_crm < backup_20260225_200000.sql
```

## 📝 Comandos Prisma - Referencia Rápida

| Comando | Uso | Seguro en Producción |
|---------|-----|---------------------|
| `prisma migrate dev` | Desarrollo - crear migraciones | ❌ No |
| `prisma migrate deploy` | Producción - aplicar migraciones | ✅ Sí |
| `prisma db push` | Sincronizar schema (ELIMINA DATOS) | ❌ NUNCA |
| `prisma migrate reset` | Resetear DB (ELIMINA TODO) | ❌ NUNCA |
| `prisma generate` | Regenerar Prisma Client | ✅ Sí |
| `prisma studio` | Explorar datos visualmente | ✅ Sí (solo lectura) |

## 🎯 Reglas de Oro

1. ✅ **SIEMPRE** usar `migrate dev` en desarrollo
2. ✅ **SIEMPRE** usar `migrate deploy` en producción
3. ❌ **NUNCA** usar `db push` con datos importantes
4. ✅ **SIEMPRE** hacer commit de las migraciones
5. ✅ **SIEMPRE** hacer backups antes de cambios grandes
6. ✅ **SIEMPRE** probar migraciones en desarrollo primero

## 📚 Más Información

- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production Best Practices](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate)
