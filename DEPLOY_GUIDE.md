# 🚀 Guía de Deploy - KOSMOS CRM

## 📋 Arquitectura de Deploy

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO FINAL                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              DOMINIO (Mailchimp/Cloudflare)             │
│                   kosmoscrm.com                          │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             ↓                        ↓
┌────────────────────────┐  ┌────────────────────────────┐
│   VERCEL (Frontend)    │  │    VPS (Backend + DB)      │
│   - Next.js Pages      │  │    - API Routes            │
│   - Static Assets      │  │    - PostgreSQL            │
│   - SSR/SSG            │  │    - Uploads/Storage       │
└────────────────────────┘  └────────────────────────────┘
```

---

## ✅ CHECKLIST PRE-DEPLOY

### Local (Completado ✅)
- [x] PostgreSQL instalado y configurado
- [x] Base de datos `kosmos_crm` creada
- [x] Migraciones ejecutadas (`prisma migrate dev`)
- [x] Seed ejecutado con datos de prueba
- [x] `.env` configurado (NO se sube a GitHub)
- [x] `.gitignore` actualizado
- [x] Proyecto funciona en `npm run dev`

### GitHub (Siguiente Paso)
- [ ] Crear repositorio privado en GitHub
- [ ] Subir código (sin `.env`)
- [ ] Verificar que `.env` NO esté en el repo

### Dominio (Ya Comprado)
- [x] Dominio comprado en Mailchimp
- [ ] Configurar DNS en Cloudflare (recomendado)

### Vercel (Frontend)
- [ ] Crear cuenta en Vercel
- [ ] Conectar repo de GitHub
- [ ] Configurar variables de entorno
- [ ] Deploy automático

### VPS (Backend + DB)
- [x] VPS Ubuntu 24.04 configurado
- [x] SSH funcionando
- [x] UFW (firewall) configurado
- [ ] Instalar Node.js 18+
- [ ] Instalar PostgreSQL
- [ ] Instalar PM2
- [ ] Configurar Nginx
- [ ] Configurar SSL (Let's Encrypt)

---

## 🔧 PASO 1: Subir a GitHub

### 1.1 Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `kosmos-crm`
3. Visibilidad: **Private** (importante)
4. NO inicializar con README (ya tienes uno)
5. Click en **Create repository**

### 1.2 Inicializar Git y Subir Código

Ejecuta en PowerShell desde la raíz del proyecto:

```powershell
# Inicializar repositorio (si no está inicializado)
git init

# Agregar todos los archivos (excepto los del .gitignore)
git add .

# Verificar que .env NO esté en la lista
git status

# Crear primer commit
git commit -m "Initial commit - KOSMOS CRM Sprint 1 + Sprint 2"

# Conectar con GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/kosmos-crm.git

# Subir código
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE**: Antes de hacer `git push`, ejecuta `git status` y verifica que `.env` NO aparezca en la lista de archivos a subir.

---

## 🌐 PASO 2: Configurar Cloudflare + Dominio

### 2.1 Transferir DNS a Cloudflare (Recomendado)

**Por qué Cloudflare:**
- DNS más rápido
- SSL gratuito
- CDN gratuito
- Protección DDoS
- UI más simple que Mailchimp

**Pasos:**

1. **Crear cuenta en Cloudflare**: https://dash.cloudflare.com/sign-up
2. **Agregar sitio**: Click en "Add a Site"
3. **Ingresar dominio**: `kosmoscrm.com` (o el que compraste)
4. **Seleccionar plan Free**
5. **Cloudflare te dará 2 nameservers**, ejemplo:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

6. **Ir a Mailchimp** (donde compraste el dominio):
   - Buscar sección "DNS Settings" o "Nameservers"
   - Cambiar los nameservers por los de Cloudflare
   - Guardar cambios

7. **Esperar 5-30 minutos** para que se propague

8. **Verificar en Cloudflare** que el dominio esté activo

---

## ☁️ PASO 3: Deploy en Vercel (Frontend)

### 3.1 Crear Cuenta en Vercel

1. Ve a https://vercel.com/signup
2. Regístrate con tu cuenta de GitHub
3. Autoriza a Vercel para acceder a tus repositorios

### 3.2 Importar Proyecto

1. Click en **"Add New..."** → **"Project"**
2. Selecciona el repositorio `kosmos-crm`
3. Vercel detectará automáticamente que es Next.js
4. **NO hagas deploy todavía**, primero configura las variables de entorno

### 3.3 Configurar Variables de Entorno en Vercel

En la sección **"Environment Variables"**, agrega:

```env
DATABASE_URL=postgresql://user:password@YOUR_VPS_IP:5432/kosmos_crm?schema=public
JWT_SECRET=tu-secret-super-seguro-produccion-2024
JWT_REFRESH_SECRET=tu-refresh-secret-super-seguro-2024
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://kosmoscrm.com
```

**⚠️ IMPORTANTE**: 
- `YOUR_VPS_IP` debe ser la IP pública de tu VPS
- Los secrets deben ser diferentes a los de desarrollo
- Genera secrets seguros con: `openssl rand -base64 32`

### 3.4 Deploy

1. Click en **"Deploy"**
2. Espera 2-3 minutos
3. Vercel te dará una URL temporal: `kosmos-crm-xxx.vercel.app`
4. Verifica que funcione

### 3.5 Conectar Dominio Personalizado

1. En Vercel, ve a **Settings** → **Domains**
2. Click en **"Add"**
3. Ingresa tu dominio: `kosmoscrm.com`
4. Vercel te dará registros DNS para configurar

5. **Ir a Cloudflare** → **DNS** → **Records**
6. Agregar los registros que Vercel te indicó:
   ```
   Type: A
   Name: @
   Content: 76.76.21.21 (ejemplo, usa el que te dé Vercel)
   
   Type: CNAME
   Name: www
   Content: cname.vercel-dns.com
   ```

7. Esperar 5-30 minutos
8. Vercel configurará SSL automáticamente (HTTPS)

---

## 🖥️ PASO 4: Configurar VPS (Backend + DB)

### 4.1 Conectar al VPS

```bash
ssh root@YOUR_VPS_IP
```

### 4.2 Instalar Node.js 18+

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalación
node -v
npm -v
```

### 4.3 Instalar PostgreSQL

```bash
# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Iniciar servicio
systemctl start postgresql
systemctl enable postgresql

# Crear base de datos y usuario
sudo -u postgres psql

# Dentro de psql:
CREATE DATABASE kosmos_crm;
CREATE USER kosmos_user WITH ENCRYPTED PASSWORD 'password_super_seguro';
GRANT ALL PRIVILEGES ON DATABASE kosmos_crm TO kosmos_user;
\q
```

### 4.4 Configurar PostgreSQL para Conexiones Externas

```bash
# Editar postgresql.conf
nano /etc/postgresql/14/main/postgresql.conf

# Buscar y cambiar:
listen_addresses = '*'

# Editar pg_hba.conf
nano /etc/postgresql/14/main/pg_hba.conf

# Agregar al final:
host    all             all             0.0.0.0/0               md5

# Reiniciar PostgreSQL
systemctl restart postgresql
```

### 4.5 Configurar Firewall

```bash
# Permitir PostgreSQL (solo desde Vercel si es posible)
ufw allow 5432/tcp

# Verificar
ufw status
```

### 4.6 Ejecutar Migraciones en Producción

Desde tu PC local:

```powershell
# Conectar a la BD del VPS y ejecutar migraciones
$env:DATABASE_URL="postgresql://kosmos_user:password@YOUR_VPS_IP:5432/kosmos_crm"
npx prisma migrate deploy
npm run db:seed
```

---

## 📧 PASO 5: Conectar Mailchimp

### 5.1 Configurar Mailchimp para Emails Transaccionales

1. Ve a Mailchimp → **Transactional Email**
2. Crea una API Key
3. Agrega la API Key a las variables de entorno de Vercel:
   ```
   MAILCHIMP_API_KEY=tu-api-key
   ```

### 5.2 Configurar Dominio en Mailchimp

1. Mailchimp → **Settings** → **Domains**
2. Agregar dominio `kosmoscrm.com`
3. Verificar con registros DNS (Mailchimp te dirá cuáles)

---

## ✅ PASO 6: Verificación Final

### 6.1 Checklist de Verificación

- [ ] Frontend accesible en `https://kosmoscrm.com`
- [ ] SSL (HTTPS) funcionando
- [ ] Login funciona
- [ ] Dashboard carga correctamente
- [ ] API endpoints responden (ingresos, gastos, etc.)
- [ ] Base de datos tiene datos de prueba
- [ ] Mailchimp envía emails (si aplica)

### 6.2 Comandos de Verificación

```bash
# Verificar que el dominio resuelve correctamente
nslookup kosmoscrm.com

# Verificar SSL
curl -I https://kosmoscrm.com

# Verificar API
curl https://kosmoscrm.com/api/health
```

---

## 📊 PASO 7: Documentación para Cliente

### 7.1 Credenciales de Acceso

```
URL: https://kosmoscrm.com
Email: admin@kosmoscrm.com
Password: admin123

Empresas de prueba:
- Tech Solutions S.A.
- Marketing Pro Ltd.
```

### 7.2 Funcionalidades Implementadas

**Sprint 1:**
- ✅ Login y autenticación
- ✅ Selección de empresa (onboarding)
- ✅ Dashboard corporativo con KPIs
- ✅ Módulo de Ingresos (CRUD completo)

**Sprint 2:**
- ✅ Módulo de Gastos (CRUD + import/export)
- ✅ Módulo de Actividades (CRUD + export)
- ✅ Pipeline de Ventas (Kanban + CRUD)
- ✅ Módulo de Documentos (upload/download)
- ✅ Módulo de Contratos (CRUD + vencimientos)

**Total: 9 módulos funcionales**

### 7.3 Datos de Prueba

- 10 ingresos
- 10 gastos
- 10 actividades
- 10 oportunidades
- 5 documentos
- 5 contratos

---

## 🔧 Mantenimiento

### Deploy Automático

Cada vez que hagas `git push` a la rama `main`:
- Vercel detectará el cambio
- Ejecutará build automáticamente
- Desplegará la nueva versión
- Todo en ~2 minutos

### Backups de Base de Datos

```bash
# Backup manual
pg_dump -U kosmos_user -h localhost kosmos_crm > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U kosmos_user -h localhost kosmos_crm < backup_20240127.sql
```

### Monitoreo

- **Vercel**: Dashboard con analytics y logs
- **VPS**: Instalar herramientas como `htop`, `netdata`

---

## 🆘 Solución de Problemas

### Error: "Database connection failed"

**Causa**: Vercel no puede conectar a PostgreSQL en VPS

**Solución**:
1. Verificar que PostgreSQL esté corriendo: `systemctl status postgresql`
2. Verificar firewall: `ufw status`
3. Verificar que `listen_addresses = '*'` en postgresql.conf
4. Verificar credenciales en Vercel Environment Variables

### Error: "Module not found"

**Causa**: Dependencias no instaladas en Vercel

**Solución**:
1. Verificar que `package.json` tenga todas las dependencias
2. Re-deploy en Vercel

### Error: "SSL certificate invalid"

**Causa**: SSL no se ha propagado

**Solución**:
1. Esperar 5-30 minutos
2. Verificar registros DNS en Cloudflare
3. Forzar renovación en Vercel

---

## 📞 Contacto y Soporte

Para soporte técnico:
- Email: soporte@kosmoscrm.com
- Documentación: https://docs.kosmoscrm.com

---

**Última actualización**: 27 de enero de 2026
