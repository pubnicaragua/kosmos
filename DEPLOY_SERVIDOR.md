# 🚀 Guía de Deploy en Servidor Producción

## 📋 Pre-requisitos

- Acceso SSH al servidor: `ssh extel@186.1.56.251 -p 1510`
- Contraseña del usuario `extel`
- Ruta del proyecto: `/home/extel/kosmos`

## ✅ Pasos para Deploy

### 1. Conectarse al Servidor

```bash
ssh extel@186.1.56.251 -p 1510
```

### 2. Navegar al Directorio del Proyecto

```bash
cd /home/extel/kosmos
```

### 3. Verificar Estado Actual

```bash
# Ver rama actual y estado
git status

# Ver último commit
git log -1 --oneline

# Ver procesos PM2
pm2 status
```

### 4. Hacer Backup (Opcional pero Recomendado)

```bash
# Backup de .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Backup de base de datos (si aplica)
# pg_dump -h 186.1.56.251 -U kosmos_user -d kosmos_crm > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5. Pull de Cambios desde GitHub

```bash
# Asegurarse de estar en main
git checkout main

# Pull de cambios
git pull origin main

# Verificar que se descargaron los últimos commits
git log -3 --oneline
```

**Commits esperados:**
- `f77e609` - Fix: Tickets tipo Select estricto (evita 500), cotizaciones sin auto-seleccion cliente
- `d64e387` - Fix: Tickets enum values, ocultar monto cuando Sin Cobro, mejorar preview busqueda estilo Trello

### 6. Instalar Dependencias (si hay cambios en package.json)

```bash
npm install
```

### 7. Ejecutar Migraciones de Base de Datos (si hay cambios en schema.prisma)

```bash
npx prisma migrate deploy
```

### 8. Generar Cliente de Prisma

```bash
npx prisma generate
```

### 9. Build de Producción

```bash
npm run build
```

**⚠️ IMPORTANTE:** Esperar a que el build termine completamente. Debe mostrar:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

### 10. Reiniciar Aplicación con PM2

```bash
# Reiniciar la aplicación
pm2 restart kosmos-crm

# O si no existe el proceso, iniciarlo
pm2 start npm --name "kosmos-crm" -- start

# Guardar configuración PM2
pm2 save
```

### 11. Verificar que Todo Funciona

```bash
# Ver logs en tiempo real
pm2 logs kosmos-crm --lines 50

# Ver estado
pm2 status

# Verificar que no haya errores
pm2 logs kosmos-crm --err --lines 20
```

### 12. Probar en el Navegador

Abrir: `http://www.kosmoscrm.com`

**Verificar:**
- ✅ Login funciona
- ✅ Módulo de Tickets carga sin errores
- ✅ Crear ticket con tipo de solicitud (Select estricto)
- ✅ Buscador de tickets con preview funciona
- ✅ Módulo de Cotizaciones carga
- ✅ Crear cotización - cliente NO se auto-selecciona
- ✅ ClientAutocomplete muestra clientes ordenados alfabéticamente

## 🔧 Troubleshooting

### Error: "Cannot find module '.next'"

```bash
# Hacer build nuevamente
npm run build
pm2 restart kosmos-crm
```

### Error: "Port 3000 already in use"

```bash
# Ver qué está usando el puerto
lsof -i :3000

# Matar proceso si es necesario
pm2 delete kosmos-crm
pm2 start npm --name "kosmos-crm" -- start
```

### Error: "Database connection failed"

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar variables de entorno
cat .env | grep DATABASE_URL
```

### Logs muestran errores de Prisma

```bash
# Regenerar cliente Prisma
npx prisma generate

# Reiniciar
pm2 restart kosmos-crm
```

## 📊 Testing Post-Deploy

### Opción 1: Testing Manual

1. Login con usuario admin
2. Crear un ticket nuevo
3. Verificar que tipo de solicitud es Select (no input libre)
4. Crear una cotización
5. Verificar que cliente NO se auto-selecciona
6. Usar buscador de tickets
7. Verificar preview con toda la información

### Opción 2: Testing Automatizado (Recomendado)

```bash
# En tu máquina local, ejecutar:
node test-cruds.mjs

# Con variables de entorno:
API_URL=http://www.kosmoscrm.com \
TEST_EMAIL=admin@kosmoscrm.com \
TEST_PASSWORD=tu_password \
node test-cruds.mjs
```

## 🎯 Checklist Final

- [ ] Git pull exitoso
- [ ] npm install completado
- [ ] Build exitoso sin errores
- [ ] PM2 restart exitoso
- [ ] PM2 logs sin errores críticos
- [ ] Login funciona en navegador
- [ ] Tickets: tipo es Select estricto
- [ ] Tickets: buscador con preview funciona
- [ ] Cotizaciones: cliente NO se auto-selecciona
- [ ] ClientAutocomplete ordenado alfabéticamente

## 📝 Notas Importantes

- **Ruta del proyecto:** `/home/extel/kosmos`
- **Usuario SSH:** `extel`
- **Puerto SSH:** `1510`
- **Base de datos:** PostgreSQL en `186.1.56.251:5432`
- **PM2 process name:** `kosmos-crm`
- **URL producción:** `http://www.kosmoscrm.com`

## 🆘 Rollback (Si algo sale mal)

```bash
# Ver commits anteriores
git log --oneline -5

# Volver al commit anterior
git reset --hard <commit_hash_anterior>

# Rebuild
npm run build

# Restart
pm2 restart kosmos-crm
```

---

**Última actualización:** 5 de Mayo 2026
**Commits incluidos:** f77e609, d64e387
