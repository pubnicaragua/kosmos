# COMMIT FIXES PRODUCCIÓN - ERRORES CRÍTICOS RESUELTOS

## 🚀 COMANDO PARA COMMIT

```bash
git add .
git commit -m "Fix: Critical production errors - Gastos GET, Vercel upload, Inventario category

✅ Fixed Production Errors:

1. Gastos API - 405 Error
   - Added missing GET endpoint in /api/expenses/[id]
   - Fixes: Error al cargar el gasto
   - File: src/app/api/expenses/[id]/route.ts

2. Vercel Upload 413 - Config Pattern
   - Changed pattern from specific file to api/**
   - Applies maxDuration 60s + memory 1024MB to ALL API routes
   - Fixes: Marketing/Tickets upload errors for videos >10s
   - File: vercel.json
   - CRITICAL: Requires Vercel redeploy to apply

3. Inventario Category Creation
   - Added visible '+ Nueva' button next to category filter
   - Added modal for inline category creation
   - Integrated with existing API endpoint
   - Files: src/app/(dashboard)/inventario/page.tsx

✅ Also Fixed:
- TypeScript: prisma.category → prisma.productCategory
- Build errors resolved

⚠️ Pending Debug (require server logs):
- Solicitudes 500 error on create
- Notificaciones not showing (code implemented, UI issue)
- Marketing validation errors (null fields)

Files changed: 4
- src/app/api/expenses/[id]/route.ts (added GET)
- vercel.json (fixed pattern)
- src/app/api/categories/route.ts (model fix)
- src/app/(dashboard)/inventario/page.tsx (UI + modal)

IMPORTANT: Vercel redeploy required for upload fix to apply!"

git push
```

---

## 🚀 DEPLOYMENT CRÍTICO

### PASO 1: Push + Vercel Redeploy
```bash
git push
```

**Vercel detectará el cambio en `vercel.json` y redesplegará automáticamente.**

**Esto resolverá:**
- ✅ Upload 413 errors en Marketing (videos >10s)
- ✅ Upload 413 errors en Tickets
- ✅ Límites aplicados a TODOS los endpoints API

### PASO 2: Servidor Ubuntu
```bash
ssh extel@186.1.56.251 -p 1510
cd ~/kosmos
git pull origin main
npx prisma generate
npm run build
pm2 restart kosmos-crm
```

---

## 🔍 DEBUG REQUERIDO

### 1. Solicitudes 500 Error
**Comando en servidor:**
```bash
pm2 logs kosmos-crm --lines 200 | grep -A 10 "purchase-requests"
```

**Buscar:**
- Error específico al crear solicitud
- Problema en notificaciones o validación

### 2. Notificaciones No Funcionan
**Verificar en browser (DevTools → Console):**
```
1. Buscar: "Fetching notifications via polling"
2. Verificar: Polling cada 10s activo
3. Crear solicitud y verificar si se crea en DB
```

**Verificar en servidor:**
```bash
# Ver si las notificaciones se crean en DB
cd ~/kosmos
npx prisma studio
# Ir a tabla Notification y verificar registros
```

### 3. Marketing Validation Error
**Error:** "Expected string, received null"

**Fix necesario:** Buscar en `src/app/(dashboard)/marketing/[id]/page.tsx` campos que envían `null` y cambiar a `""` o no enviarlos.

---

## ✅ VERIFICACIÓN POST-DEPLOYMENT

### 1. Upload de Videos
- Marketing: Subir video de 10-20 segundos
- Tickets: Subir evidencia en video
- **Debe funcionar sin error 413**

### 2. Gastos
- Click en card de gasto existente
- **Debe abrir detalle sin error 405**

### 3. Inventario
- Ir a filtros avanzados
- Ver botón "+ Nueva" junto a Categoría
- Click → Modal para crear categoría
- **Debe crear categoría correctamente**

### 4. Importar Inventario
- Descargar plantilla
- Importar plantilla descargada
- **Debe funcionar (tiene datos de ejemplo)**

---

## 📊 RESUMEN

**Fixes Implementados:** 3/9
- ✅ Gastos GET endpoint
- ✅ Vercel upload config (requiere redeploy)
- ✅ Inventario category creation

**Requieren Debug:** 3
- ⚠️ Solicitudes 500
- ⚠️ Notificaciones UI
- ⚠️ Marketing validation

**Requieren Desarrollo:** 3
- 📋 RRHH enhancement (2-3h)
- 📋 Dashboard improvements (1-2h)
- 📋 Global search (1h)

---

## 🎯 SIGUIENTE PASO

1. **AHORA:** Push + esperar Vercel redeploy (2-3 min)
2. **LUEGO:** Verificar upload funciona
3. **DESPUÉS:** Debug errores con logs del servidor

---

**CRÍTICO:** El fix de upload 413 NO funcionará hasta que Vercel redespliegue con el nuevo `vercel.json`.
