# 🐘 Guía de Instalación PostgreSQL Local - KOSMOS CRM

## ✅ Estado Actual
- ❌ PostgreSQL NO instalado
- ✅ Enum UserRole duplicado RESUELTO en schema.prisma
- ⏳ Esperando instalación de PostgreSQL para continuar

---

## 📥 PASO 1: Descargar PostgreSQL

### Opción Recomendada: Instalador Oficial

1. **Descarga PostgreSQL 15 o 16 para Windows:**
   - URL: https://www.postgresql.org/download/windows/
   - O directo: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   
2. **Selecciona:**
   - Sistema operativo: **Windows x86-64**
   - Versión: **15.x** o **16.x** (la más reciente)

---

## 🔧 PASO 2: Instalar PostgreSQL

### Durante la Instalación:

1. **Componentes a instalar:**
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (interfaz gráfica)
   - ✅ Command Line Tools (psql)
   - ✅ Stack Builder (opcional)

2. **Directorio de instalación:**
   - Deja el predeterminado: `C:\Program Files\PostgreSQL\15`

3. **Puerto:**
   - Deja el predeterminado: `5432`

4. **⚠️ IMPORTANTE - Password del superusuario:**
   - Usuario: `postgres` (predeterminado, no cambiar)
   - **Password:** Elige una contraseña SIMPLE para desarrollo local
   - Ejemplos: `postgres`, `admin123`, `12345678`
   - **📝 ANOTA ESTA CONTRASEÑA** - la necesitarás para el `.env`

5. **Locale:**
   - Deja el predeterminado (Spanish, Spain o Default locale)

6. **Finalizar instalación**

---

## ✅ PASO 3: Verificar Instalación

Después de instalar, abre **PowerShell** y ejecuta:

```powershell
psql --version
```

**Resultado esperado:**
```
psql (PostgreSQL) 15.x
```

Si ves este mensaje, ✅ **PostgreSQL está instalado correctamente**.

---

## 🗄️ PASO 4: Crear Base de Datos

### Opción A: Usando pgAdmin 4 (Interfaz Gráfica)

1. Abre **pgAdmin 4** desde el menú de Windows
2. Conéctate al servidor local (usa la contraseña que elegiste)
3. Click derecho en **Databases** → **Create** → **Database**
4. Nombre: `kosmos_crm`
5. Owner: `postgres`
6. Click **Save**

### Opción B: Usando psql (Línea de Comandos)

Abre PowerShell y ejecuta:

```powershell
# Conectar a PostgreSQL
psql -U postgres

# Te pedirá la contraseña que elegiste durante la instalación
# Luego ejecuta:
CREATE DATABASE kosmos_crm;

# Verifica que se creó:
\l

# Sal de psql:
\q
```

---

## 📝 PASO 5: Configurar .env

Una vez creada la base de datos, crea el archivo `.env` en la raíz del proyecto:

**Ubicación:** `c:/Users/Probook 450 G7/Desktop/KOSMOS CRM/Kosmos CRM/Kosmos/.env`

**Contenido:**

```env
# =========================
# DATABASE (LOCAL DEV)
# =========================
DATABASE_URL="postgresql://postgres:TU_PASSWORD_AQUI@localhost:5432/kosmos_crm?schema=public"

# =========================
# AUTH
# =========================
JWT_SECRET="kosmos-dev-jwt-secret-2024"
JWT_REFRESH_SECRET="kosmos-dev-refresh-secret-2024"

# =========================
# APP
# =========================
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**⚠️ Reemplaza `TU_PASSWORD_AQUI` con la contraseña que elegiste en el PASO 2.**

**Ejemplo:**
Si tu contraseña es `postgres123`, la línea quedaría:
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/kosmos_crm?schema=public"
```

---

## 🚀 PASO 6: Ejecutar Migraciones de Prisma

Una vez configurado el `.env`, ejecuta en orden:

```powershell
# 1. Formatear schema
npx prisma format

# 2. Validar schema
npx prisma validate

# 3. Generar cliente Prisma
npx prisma generate

# 4. Crear y aplicar migraciones
npx prisma migrate dev --name init_kosmos

# 5. Abrir Prisma Studio (opcional - para ver la BD)
npx prisma studio
```

---

## 📊 PASO 7: Seed de Datos (Próximo)

Después de las migraciones, ejecutaremos:

```powershell
npm run db:seed
```

Esto creará:
- 1 usuario SUPER_ADMIN
- 2 empresas de prueba
- 10 ingresos
- 10 gastos
- 10 actividades
- 10 oportunidades
- 5 documentos
- 5 contratos

---

## 🆘 Solución de Problemas

### Error: "psql no se reconoce como comando"

**Causa:** Las herramientas de PostgreSQL no están en el PATH.

**Solución:**

1. Busca la carpeta de instalación: `C:\Program Files\PostgreSQL\15\bin`
2. Agrega al PATH de Windows:
   - Panel de Control → Sistema → Configuración avanzada del sistema
   - Variables de entorno → Path → Editar
   - Agregar: `C:\Program Files\PostgreSQL\15\bin`
3. Reinicia PowerShell

### Error: "Connection refused" o "could not connect"

**Causa:** El servicio de PostgreSQL no está corriendo.

**Solución:**

1. Abre **Servicios** de Windows (Win + R → `services.msc`)
2. Busca `postgresql-x64-15`
3. Click derecho → Iniciar
4. Configura como "Automático" para que inicie con Windows

### Error: "password authentication failed"

**Causa:** Contraseña incorrecta.

**Solución:**

1. Verifica que la contraseña en `.env` sea exactamente la que elegiste
2. No debe tener espacios ni caracteres especiales sin escapar
3. Si olvidaste la contraseña, reinstala PostgreSQL

---

## 📞 Siguiente Paso

Una vez completada la instalación, confirma en el chat:

✅ "PostgreSQL instalado correctamente"
🔑 "Mi contraseña es: [tu_password]"

Y continuaremos con la configuración del proyecto.
