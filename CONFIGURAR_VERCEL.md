# 🚀 CONFIGURACIÓN DE VERCEL PARA PRODUCCIÓN

**Fecha:** 27 de enero de 2026  
**Estado Actual:** ❌ Base de datos NO configurada (Error 500)

---

## ❌ PROBLEMA ACTUAL

**Error en consola de producción:**
```
Failed to load resource: the server responded with a status of 500 ()
```

**Causa:**
- Las variables de entorno NO están configuradas en Vercel
- La base de datos de producción NO existe
- Prisma intenta conectarse y falla

---

## ✅ SOLUCIÓN: 3 PASOS SIMPLES

### PASO 1: Configurar Variables de Entorno en Vercel

1. **Ve a tu proyecto en Vercel:**
   - https://vercel.com/tu-usuario/kosmos

2. **Settings → Environment Variables**

3. **Agrega estas variables:**

```env
# Base de Datos (REQUERIDO)
DATABASE_URL=postgresql://usuario:password@host:5432/kosmos_production

# JWT Secrets (REQUERIDO)
JWT_SECRET=kosmos-super-secret-key-production-2026
JWT_REFRESH_SECRET=kosmos-refresh-secret-key-production-2026

# JWT Expiration (OPCIONAL - usa defaults si no los pones)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

4. **Aplica a:** Production, Preview, Development (marca las 3)

5. **Guarda**

---

### PASO 2: Crear Base de Datos de Producción

#### Opción A: Usar Vercel Postgres (RECOMENDADO - GRATIS)

1. En tu proyecto Vercel → **Storage** → **Create Database**
2. Selecciona **Postgres**
3. Nombre: `kosmos-production`
4. Region: `Washington, D.C., USA (iad1)`
5. **Create**

Vercel automáticamente agregará `DATABASE_URL` a tus variables de entorno.

#### Opción B: Usar Base de Datos Externa

Proveedores recomendados:
- **Supabase** (gratis): https://supabase.com
- **Railway** (gratis): https://railway.app
- **Neon** (gratis): https://neon.tech

Copia el `DATABASE_URL` que te den y pégalo en Vercel.

---

### PASO 3: Ejecutar Migraciones y Seed

Una vez configurada la BD, ejecuta estos comandos **UNA SOLA VEZ**:

#### 3.1 Conectar a la BD de Producción Localmente

```bash
# 1. Copia el DATABASE_URL de Vercel
# 2. Crea archivo .env.production
DATABASE_URL="postgresql://usuario:password@host:5432/kosmos_production"

# 3. Ejecuta migraciones
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 4. Ejecuta seed
npx prisma db seed
```

#### 3.2 O Ejecutar desde Vercel CLI

```bash
# Instala Vercel CLI
npm i -g vercel

# Login
vercel login

# Link proyecto
vercel link

# Ejecuta comando en producción
vercel env pull .env.production
npx prisma migrate deploy
npx prisma db seed
```

---

## 🎯 RESULTADO ESPERADO

Después de completar los 3 pasos:

✅ **Variables de entorno configuradas**  
✅ **Base de datos creada y conectada**  
✅ **Migraciones aplicadas**  
✅ **Datos de prueba insertados**  
✅ **Login funcional con credenciales:**

```
👑 SUPER ADMIN:
   Email: admin@kosmoscrm.com
   Password: admin123

👔 MANAGER:
   Email: manager@kosmoscrm.com
   Password: manager123

👤 USER:
   Email: user@kosmoscrm.com
   Password: user123
```

---

## 🔧 VERIFICACIÓN

### 1. Verifica que Vercel hizo redeploy
Después de agregar variables de entorno, Vercel automáticamente hace redeploy.

### 2. Prueba el login
```
https://tu-app.vercel.app/login
Email: admin@kosmoscrm.com
Password: admin123
```

### 3. Verifica logs en Vercel
Si sigue fallando:
- Ve a tu proyecto → **Deployments** → último deploy → **View Function Logs**
- Busca errores de Prisma o base de datos

---

## ❓ PREGUNTAS FRECUENTES

### ¿Necesito un bypass en el login?
**NO.** El código de autenticación está correcto. Solo necesitas configurar las variables de entorno.

### ¿Por qué funciona en local pero no en Vercel?
Porque en local tienes `.env` con `DATABASE_URL`. Vercel necesita que lo configures manualmente.

### ¿Puedo usar mi base de datos local desde Vercel?
**NO recomendado** para producción, pero para pruebas:
1. Expón tu PostgreSQL local a internet (ngrok, túnel SSH)
2. Usa esa URL en Vercel
3. **Solo para desarrollo, nunca en producción**

### ¿Cuánto cuesta?
- **Vercel Postgres:** Gratis hasta 256 MB
- **Supabase:** Gratis hasta 500 MB
- **Railway:** Gratis con límites
- **Neon:** Gratis hasta 3 GB

---

## 📋 CHECKLIST FINAL

Antes de mostrar al cliente:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos creada y conectada
- [ ] Migraciones ejecutadas (`prisma migrate deploy`)
- [ ] Seed ejecutado (`prisma db seed`)
- [ ] Login funciona con `admin@kosmoscrm.com / admin123`
- [ ] Dashboard carga con datos
- [ ] Todas las vistas muestran información
- [ ] No hay errores 500 en consola

---

## 🆘 SI ALGO FALLA

### Error: "Prisma Client not found"
```bash
# En Vercel, asegúrate que package.json tiene:
"postinstall": "prisma generate"
```

### Error: "Can't reach database server"
- Verifica que `DATABASE_URL` esté correcta
- Verifica que la BD esté activa
- Verifica que el firewall permita conexiones desde Vercel

### Error: "Invalid credentials"
- Ejecuta el seed: `npx prisma db seed`
- Verifica que los usuarios se crearon en la BD

---

**¡Una vez configurado, el sistema funcionará perfectamente en producción!** 🎉

**NO necesitas bypass, solo configuración de entorno.**
