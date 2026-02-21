# KOSMOS CRM — Guía de Despliegue

## Requisitos previos

- Node.js 18+ y npm
- PostgreSQL 14+
- Git

---

## 1. Despliegue en Base de Datos Local (Windows)

### 1.1 Instalar PostgreSQL localmente
1. Descarga e instala PostgreSQL desde https://www.postgresql.org/download/windows/
2. Durante la instalación, anota el usuario (`postgres`) y la contraseña que configures.
3. Crea la base de datos:
   ```sql
   CREATE DATABASE kosmoscrm;
   ```

### 1.2 Configurar variables de entorno
Crea el archivo `.env` en la raíz del proyecto (junto a `package.json`):

```env
# Base de datos
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/kosmoscrm"

# JWT Secrets (usa strings aleatorios largos)
JWT_SECRET="tu_jwt_secret_muy_largo_y_seguro_aqui"
JWT_REFRESH_SECRET="tu_refresh_secret_muy_largo_y_seguro_aqui"

# Duración de tokens
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="30d"

# Cookies
ACCESS_TOKEN_COOKIE="kosmos_access"
REFRESH_TOKEN_COOKIE="kosmos_refresh"
REMEMBER_ME_COOKIE="kosmos_remember"

# URL de la app
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 1.3 Instalar dependencias y migrar la base de datos
```powershell
cd "c:\Users\Probook 450 G7\Desktop\KOSMOS CRM\Kosmos CRM\Kosmos"
npm install
npx prisma migrate deploy
npx prisma generate
```

### 1.4 Crear usuario inicial (seed)
```powershell
npx prisma db seed
```
> Si no hay seed script, crea el primer usuario directamente en la BD o via la API de registro.

### 1.5 Ejecutar en desarrollo
```powershell
npm run dev
```
Accede en: http://localhost:3000

### 1.6 Build de producción local
```powershell
npm run build
npm run start
```

---

## 2. Despliegue en Ubuntu VPS (Extel)

### 2.1 Preparar el servidor Ubuntu

Conéctate al VPS por SSH:
```bash
ssh usuario@IP_DEL_VPS
```

Instala dependencias del sistema:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# PM2 (gestor de procesos)
sudo npm install -g pm2
```

### 2.2 Configurar PostgreSQL en el VPS
```bash
sudo -u postgres psql

# Dentro de psql:
CREATE USER kosmosuser WITH PASSWORD 'PASSWORD_SEGURA';
CREATE DATABASE kosmoscrm OWNER kosmosuser;
GRANT ALL PRIVILEGES ON DATABASE kosmoscrm TO kosmosuser;
\q
```

### 2.3 Clonar o subir el proyecto

**Opción A — Git:**
```bash
cd /var/www
git clone https://github.com/TU_USUARIO/kosmos-crm.git kosmos
cd kosmos
```

**Opción B — SCP desde Windows (ejecutar en PowerShell local):**
```powershell
# Comprimir el proyecto (excluir node_modules y .next)
# Luego subir con scp o FileZilla al VPS
scp -r "c:\Users\Probook 450 G7\Desktop\KOSMOS CRM\Kosmos CRM\Kosmos" usuario@IP_VPS:/var/www/kosmos
```

### 2.4 Configurar variables de entorno en el VPS
```bash
cd /var/www/kosmos
nano .env
```

Contenido del `.env` en producción:
```env
DATABASE_URL="postgresql://kosmosuser:PASSWORD_SEGURA@localhost:5432/kosmoscrm"

JWT_SECRET="GENERA_UN_SECRET_LARGO_ALEATORIO"
JWT_REFRESH_SECRET="GENERA_OTRO_SECRET_LARGO_ALEATORIO"

ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="30d"

ACCESS_TOKEN_COOKIE="kosmos_access"
REFRESH_TOKEN_COOKIE="kosmos_refresh"
REMEMBER_ME_COOKIE="kosmos_remember"

NEXT_PUBLIC_APP_URL="https://TU_DOMINIO.com"
NODE_ENV="production"
```

> Para generar secrets seguros:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 2.5 Instalar dependencias y migrar
```bash
cd /var/www/kosmos
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
```

### 2.6 Iniciar con PM2
```bash
pm2 start npm --name "kosmos-crm" -- start
pm2 save
pm2 startup   # Sigue las instrucciones que imprime para auto-inicio
```

Comandos útiles de PM2:
```bash
pm2 status          # Ver estado
pm2 logs kosmos-crm # Ver logs en tiempo real
pm2 restart kosmos-crm
pm2 stop kosmos-crm
```

### 2.7 Configurar Nginx como proxy reverso
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/kosmos
```

Contenido del archivo Nginx:
```nginx
server {
    listen 80;
    server_name TU_DOMINIO.com www.TU_DOMINIO.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/kosmos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2.8 SSL con Let's Encrypt (HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d TU_DOMINIO.com -d www.TU_DOMINIO.com
```

---

## 3. Actualizar el sistema (después de cambios)

### En local:
```powershell
npm run build
npm run start
```

### En el VPS:
```bash
cd /var/www/kosmos
git pull origin main          # Si usas Git
npm install
npx prisma migrate deploy     # Solo si hay nuevas migraciones
npm run build
pm2 restart kosmos-crm
```

---

## 4. Migraciones de base de datos

Si realizas cambios al schema de Prisma (`prisma/schema.prisma`):

```bash
# Crear nueva migración (en desarrollo)
npx prisma migrate dev --name nombre_de_la_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy
```

---

## 5. Backup de la base de datos

```bash
# Crear backup
pg_dump -U kosmosuser -d kosmoscrm > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U kosmosuser -d kosmoscrm < backup_20240101.sql
```

---

## 6. Variables de entorno requeridas — Resumen

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret para access tokens | String aleatorio 64+ chars |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens | String aleatorio 64+ chars |
| `ACCESS_TOKEN_EXPIRY` | Duración access token | `15m` |
| `REFRESH_TOKEN_EXPIRY` | Duración refresh token | `30d` |
| `ACCESS_TOKEN_COOKIE` | Nombre cookie access | `kosmos_access` |
| `REFRESH_TOKEN_COOKIE` | Nombre cookie refresh | `kosmos_refresh` |
| `REMEMBER_ME_COOKIE` | Nombre cookie remember me | `kosmos_remember` |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app | `https://tudominio.com` |
| `NODE_ENV` | Entorno | `production` |

---

## 7. Puertos y Firewall

```bash
# Abrir puertos necesarios en el VPS
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

> El puerto 3000 (Next.js) NO debe exponerse directamente; Nginx actúa como proxy.
