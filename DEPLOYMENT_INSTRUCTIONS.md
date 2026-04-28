# 🚀 DEPLOYMENT INSTRUCTIONS - KOSMOS CRM

## ✅ FIXES COMPLETADOS EN ESTE COMMIT

### 1. ✅ Employees API - Error Handling
- Mensajes de error específicos con detalles de validación Zod
- Mejor logging para debugging
- **Archivo**: `src/app/api/employees/route.ts`

### 2. ✅ Inventario - Auto-cálculo de Margen
- Margen se calcula automáticamente: `((precio - costo) / costo) * 100`
- Campo "UNI/KG" renombrado a "UNIDAD" (más claro)
- **Archivos**: 
  - `src/app/(dashboard)/inventario/edicion/page.tsx`
  - `src/app/(dashboard)/inventario/page.tsx`

### 3. ✅ Cotizaciones - Notificaciones de Aprobación
- Notificación mejorada: "Cotización XXX requiere tu aprobación"
- Se envía a ADMIN/SUPER_ADMIN automáticamente
- Link directo a página de aprobación
- **Archivo**: `src/app/api/quotes/route.ts`

### 4. ✅ RRHH - Página de Detalle de Empleado
- Nueva página `/recursos-humanos/[id]` para ver perfil completo
- Muestra toda la información personal, laboral, bancaria, emergencia
- **Archivo**: `src/app/(dashboard)/recursos-humanos/[id]/page.tsx`

### 5. ✅ RRHH - Planillas Bulk Delete
- Selección múltiple de planillas con checkboxes
- Botón "ELIMINAR (N)" para borrar varias a la vez
- Confirmación antes de eliminar
- **Archivo**: `src/app/(dashboard)/recursos-humanos/page.tsx`

### 6. ✅ Verificaciones Completadas
- **Tickets KPIs**: Ya implementados en `/api/tickets/kpis` con todas las métricas
- **Purchase Requests UI**: Todos los campos visibles y funcionales
- **Marketing Upload**: API `/api/upload` funciona correctamente con Supabase
- **Type-check**: Pasando sin errores

---

## 🔧 VARIABLES DE ENTORNO REQUERIDAS EN SERVIDOR

Verificar que el servidor tenga estas variables en `.env`:

```bash
# Database
DATABASE_URL="postgresql://kosmos_user:K0sm0sCRM_Pr0d_2026%21@186.1.56.251:5432/kosmos_crm?schema=public"

# JWT
JWT_SECRET="kosmos-jwt-secret-production-2026-secure-key"
JWT_REFRESH_SECRET="kosmos-refresh-secret-production-2026-secure-key"
JWT_EXPIRES_IN="900m"
JWT_REFRESH_EXPIRES_IN="30d"

# Supabase (CRÍTICO para uploads de marketing)
NEXT_PUBLIC_SUPABASE_URL="https://sejfwazpxuzccndpgpso.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable__qJVfHLabPDWwCg6L87e3w_fRGxOHs7"

# API
NEXT_PUBLIC_API_URL="http://www.kosmoscrm.com"
NODE_ENV="production"

# Uploads (opcional, se usa Supabase principalmente)
UPLOAD_DIR="/home/extel/kosmos/uploads"
```

---

## 📋 PASOS DE DEPLOYMENT

### PASO 1: Push desde Local
```bash
git push origin main
```

### PASO 2: Conectar al Servidor
```bash
ssh extel@186.1.56.251 -p 1510
```

### PASO 3: Actualizar Código
```bash
cd ~/kosmos
git pull origin main
```

### PASO 4: Instalar Dependencias (si hay nuevas)
```bash
npm ci
```

### PASO 5: Regenerar Prisma Client
```bash
npx prisma generate
```

### PASO 6: **CRÍTICO** - Build de Producción
```bash
npm run build
```
**IMPORTANTE**: Este paso es OBLIGATORIO. El error actual del servidor es porque falta el build.

### PASO 7: Restart PM2
```bash
pm2 restart kosmos-crm
```

### PASO 8: Verificar Logs
```bash
pm2 logs kosmos-crm --lines 50
```

Deberías ver:
```
✓ Ready in XXXms
○ Compiling / ...
✓ Compiled / in XXXms
```

### PASO 9: Verificar Status
```bash
pm2 status
```

Debería mostrar:
```
│ kosmos-crm │ online │
```

### PASO 10: Test en Navegador
Abrir: `http://www.kosmoscrm.com`

---

## 🔍 TROUBLESHOOTING

### Error: "Could not find a production build in the '.next' directory"
**Causa**: No se ejecutó `npm run build` antes de `pm2 restart`
**Solución**: 
```bash
cd ~/kosmos
npm run build
pm2 restart kosmos-crm
```

### Error: Marketing evidence upload no funciona
**Causa**: Variables de Supabase no configuradas
**Solución**: Verificar `.env` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: 500 en APIs
**Causa**: Prisma client desactualizado
**Solución**:
```bash
npx prisma generate
pm2 restart kosmos-crm
```

### PM2 no inicia
**Causa**: Puerto 3000 ocupado o error en código
**Solución**:
```bash
pm2 delete kosmos-crm
pm2 start npm --name "kosmos-crm" -- start
pm2 save
```

---

## 📊 VERIFICACIÓN POST-DEPLOYMENT

Verificar estas funcionalidades:

1. ✅ **Employees API**: Crear empleado con datos inválidos debe mostrar error específico
2. ✅ **Inventario**: Cambiar costo/precio debe recalcular margen automáticamente
3. ✅ **Cotizaciones**: Crear cotización debe notificar a admins
4. ✅ **RRHH**: Click en empleado debe abrir página de detalle
5. ✅ **Planillas**: Seleccionar varias y eliminar en bulk debe funcionar
6. ✅ **Marketing**: Upload de evidencia debe subir a Supabase
7. ✅ **Purchase Requests**: Crear solicitud debe mostrar todos los campos

---

## 🎯 PRÓXIMOS PASOS (Opcional - No Bloqueante)

1. **Employee Import Template**: Verificar que plantilla descargada coincida 100% con schema
2. **Dashboard KPIs**: Agregar más KPIs avanzados integrando múltiples módulos
3. **Real-time Notifications**: Agregar sonido y notificaciones push

---

## 📞 SOPORTE

Si hay problemas durante deployment:
1. Revisar logs: `pm2 logs kosmos-crm --lines 100`
2. Verificar variables de entorno: `cat ~/kosmos/.env`
3. Verificar build existe: `ls -la ~/kosmos/.next`
4. Verificar puerto libre: `netstat -tulpn | grep 3000`

---

**Fecha**: 28 de Abril, 2026
**Commit**: Ver `git log -1 --oneline`
**Build Time**: ~2-3 minutos
**Downtime Esperado**: <30 segundos
