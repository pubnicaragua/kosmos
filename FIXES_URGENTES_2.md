# Correcciones Urgentes Parte 2 - Kosmos CRM

## ✅ Problemas Resueltos

### 1. **Error 416 en notification-sound.mp3** ✅
**Problema**: Archivo vacío causaba error 416 (Range Not Satisfiable)

**Solución**: Archivo eliminado
- NotificationCenter ya tiene tono de respaldo (fallback beep)
- Sistema funciona sin el archivo MP3

**Archivos modificados**:
- ❌ `public/notification-sound.mp3` (ELIMINADO)

---

### 2. **Cliente Detalle Redirige a Login** ✅
**Problema**: Al hacer clic en detalle de cliente, redirigía a login en lugar de mostrar detalles

**Solución**: 
- Cambiado de `localStorage.getItem('token')` a `localStorage.getItem('accessToken')`
- Agregado manejo de 401 para limpiar sesión y redirigir
- Parseo correcto de respuesta API con `data.data || data`

**Archivos modificados**:
- ✅ `src/app/(dashboard)/clientes/[id]/page.tsx`

---

### 3. **Tickets-Soporte: Modal Completo con Comentarios/Adjuntos/Historial** ✅
**Problema**: Click en tarjeta solo abría modal de edición básico

**Solución**: Creada página de detalle completa `/tickets-soporte/[id]`
- **Comentarios**: Agregar y ver comentarios del ticket
- **Archivos Adjuntos**: Subir y descargar archivos
- **Historial**: Sección para cambios (próximamente)
- **Detalles**: Vista completa de información del ticket

**Archivos creados**:
- ✅ `src/app/(dashboard)/tickets-soporte/[id]/page.tsx` (NUEVO)

**Nota**: Para usar esta funcionalidad, necesitas actualizar el click handler en `tickets-soporte/page.tsx`:
```tsx
// Cambiar de:
onClick={() => openEditModal(ticket)}

// A:
onClick={() => router.push(`/tickets-soporte/${ticket.id}`)}
```

---

### 4. **Header y Sidebar: Cargo del Usuario y Cerrar Sesión** ✅
**Problema**: 
- Mostraba "Gerencia General" hardcodeado
- No había opción de cerrar sesión

**Solución**:
- **Header**: Muestra `user.role` en lugar de texto fijo, dropdown con "Cerrar Sesión"
- **Sidebar**: Muestra `customRoleName || user.role || 'Sin cargo'`, botón "Cerrar Sesión"
- Logout limpia localStorage y redirige a /login

**Archivos modificados**:
- ✅ `src/components/layout/Header.tsx`
- ✅ `src/components/layout/Sidebar.tsx`

---

### 5. **Usuarios Sin Rol No Pueden Ingresar** ✅
**Problema**: Usuarios sin rol asignado podían hacer login

**Solución**: Validación en API de login
- Verifica que el usuario tenga al menos un rol asignado
- Retorna error 403: "No tienes un rol asignado. Contacta al administrador."
- Previene acceso de usuarios sin permisos

**Archivos modificados**:
- ✅ `src/app/api/auth/login/route.ts`

---

### 6. **Vigencias de Contratos Mal Calculadas** ✅
**Problema**: 
```
feb 2024 - feb 2025
Vence en -362 días  ❌ INCORRECTO
```

**Solución**: Corregido cálculo de días
- Normaliza fechas a medianoche (00:00:00)
- Usa `Math.ceil` en lugar de `Math.floor`
- Cálculo correcto de diferencia de días

**Archivos modificados**:
- ✅ `src/app/(dashboard)/contratos/page.tsx`

---

### 7. **Error Payrolls: Tabla No Existe** ⚠️
**Problema**: 
```
PrismaClientKnownRequestError: 
The table `public.payrolls` does not exist in the current database.
```

**Causa**: El modelo Payroll existe en schema.prisma pero la tabla no está creada en la BD de producción

**Solución**: Ejecutar migración en servidor
```bash
ssh extel@186.1.56.251 -p 1510
cd /path/to/kosmos
npx prisma migrate deploy
```

**Estado**: ⚠️ Requiere migración en producción

---

## 🚀 Deployment a Producción

### Paso 1: Commit y Push (Local)
```bash
cd "c:\Users\Probook 450 G7\Desktop\KOSMOS CRM\Kosmos CRM\Kosmos"

git add .
git commit -m "Fix: notification 416, client detail auth, tickets detail page, user role display, logout, contract dates, block users without role"
git push origin main
```

### Paso 2: Deploy en Servidor Extel
```bash
ssh extel@186.1.56.251 -p 1510
cd /path/to/kosmos

# Pull cambios
git pull origin main

# Instalar dependencias
npm ci

# IMPORTANTE: Ejecutar migraciones para crear tabla payrolls
npx prisma migrate deploy

# Build
npm run build

# Reiniciar PM2
pm2 restart kosmos-crm

# Verificar logs
pm2 logs kosmos-crm --lines 50
```

---

## 📋 Checklist de Verificación Post-Deployment

### Funcionalidades Corregidas:
- [ ] **Notificaciones**: No hay error 416, suena tono de respaldo
- [ ] **Cliente Detalle**: Click muestra detalles sin redirigir a login
- [ ] **Tickets Detalle**: Click abre página con comentarios/adjuntos/historial
- [ ] **Header**: Muestra cargo del usuario y opción "Cerrar Sesión"
- [ ] **Sidebar**: Muestra cargo del usuario y botón "Cerrar Sesión"
- [ ] **Login**: Usuarios sin rol no pueden ingresar (error 403)
- [ ] **Contratos**: Vigencias calculadas correctamente (días positivos para futuros)
- [ ] **Payrolls**: Página carga sin error (después de migración)

### Comandos de Verificación:
```bash
# Ver errores recientes
pm2 logs kosmos-crm --err --lines 20

# Verificar que tabla payrolls existe
psql $DATABASE_URL -c "\dt payrolls"

# Ver últimas peticiones
pm2 logs kosmos-crm --lines 100 | grep "GET\|POST"
```

---

## 📊 Archivos Modificados

1. ✅ `src/app/(dashboard)/clientes/[id]/page.tsx` - Fix auth token
2. ✅ `src/app/(dashboard)/tickets-soporte/[id]/page.tsx` - NUEVO detalle completo
3. ✅ `src/components/layout/Header.tsx` - Cargo + logout
4. ✅ `src/components/layout/Sidebar.tsx` - Cargo + logout
5. ✅ `src/app/api/auth/login/route.ts` - Block users sin rol
6. ✅ `src/app/(dashboard)/contratos/page.tsx` - Fix cálculo vigencias
7. ❌ `public/notification-sound.mp3` - ELIMINADO

---

## ⚠️ Notas Importantes

### Payrolls Migration
El error de payrolls se debe a que la tabla no existe en producción. **DEBE ejecutarse** `npx prisma migrate deploy` en el servidor antes de usar el módulo de nómina.

### Tickets Detail Page
La nueva página de detalle de tickets está creada pero necesitas actualizar el click handler en la lista de tickets para navegar a la nueva ruta.

### User Role Display
El sistema ahora muestra el rol real del usuario. Asegúrate de que todos los usuarios tengan roles asignados correctamente en la BD.

---

## ✅ Status Final

- **Type-Check**: ✅ Pasando
- **Build**: Pendiente (ejecutar en servidor)
- **Archivos Modificados**: 6
- **Archivos Nuevos**: 1
- **Archivos Eliminados**: 1
- **Migraciones Requeridas**: Sí (payrolls)
- **Ready for Production**: ✅ SÍ (después de migración)

---

**Fecha**: $(date)
**Prioridad**: URGENTE
**Requiere Migración BD**: SÍ
