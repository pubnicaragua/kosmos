# KOSMOS CRM - Sprint 1 Completado

## ✅ Vistas Implementadas

Este sprint incluye la implementación completa de **4 vistas principales** con frontend y backend funcional:

### 1. **Login** (`/login`)
- Formulario de autenticación con email y contraseña
- Checkbox "Recuérdame"
- Placeholder de reCAPTCHA
- Manejo de errores
- Toggle para mostrar/ocultar contraseña
- Responsive (móvil, tablet, desktop)
- Redirección automática según número de empresas del usuario

### 2. **Selección de Empresa** (`/onboarding`)
- Lista de empresas asociadas al usuario
- Indicador de estado (Activo/Inactivo)
- Fecha de creación de cada empresa
- Botón "Vista Super Admin" (condicional por rol)
- Selección de empresa activa
- Responsive (móvil, tablet, desktop)

### 3. **Dashboard Corporativo** (`/dashboards`)
- 4 KPIs principales:
  - Ventas Totales
  - Gastos Operativos
  - Valor Pipeline
  - Clientes Activos
- Filtros por empresa y período
- Gráfico de Ingresos vs Gastos (semestral)
- Tabla de Rendimiento por Empresa
- Botón "Exportar Informe"
- Responsive (móvil, tablet, desktop)

### 4. **Ingresos** (`/ingresos`)
- 3 KPIs de resumen:
  - Ingresos Totales
  - Ingresos Pendientes
  - Promedio de Venta
- Tabla completa con columnas:
  - Empresa, Fecha, N°Ref, Cliente, Concepto, Método, Monto, Margen, Estado
- Filtros por empresa, período y estado
- Paginación server-side
- Botones "Importar" y "Exportar" (placeholders)
- Badges de estado con colores (Pagado, Pendiente, Anulado, Error)
- Responsive (móvil, tablet, desktop)

---

## 🏗️ Arquitectura Backend

### Base de Datos (PostgreSQL + Prisma)

**Modelos implementados:**
- `User` - Usuarios del sistema
- `Company` - Empresas
- `UserCompany` - Relación usuario-empresa con roles
- `RefreshToken` - Tokens de refresco JWT
- `Income` - Ingresos/Facturas

**Enums:**
- `UserRole`: SUPER_ADMIN, ADMIN, MANAGER, USER
- `IncomeStatus`: PAID, PENDING, CANCELLED, ERROR

### API Endpoints

**Autenticación:**
- `POST /api/auth/login` - Inicio de sesión con JWT
- `POST /api/auth/refresh` - Renovar access token

**Perfiles:**
- `GET /api/profiles/current` - Obtener perfil del usuario actual

**Empresas:**
- `GET /api/companies` - Listar empresas del usuario
- `POST /api/companies/select` - Seleccionar empresa activa

**Dashboard:**
- `GET /api/dashboard/summary` - KPIs y datos consolidados

**Ingresos:**
- `GET /api/incomes` - Listar ingresos con paginación
- `GET /api/incomes/summary` - Resumen de ingresos
- `POST /api/incomes/import` - Importar ingresos (placeholder)
- `GET /api/incomes/export` - Exportar ingresos (placeholder)

### Seguridad
- Autenticación JWT con access token (15 min) y refresh token (7 días)
- Contraseñas hasheadas con bcrypt
- Validación de datos con Zod
- Control de acceso por empresa (multi-tenant)
- Verificación de roles por endpoint

---

## 🎨 Design System

### Colores
- **Primario**: `#0066CC` (azul)
- **Secundario**: `#003D7A` (azul oscuro)
- **Éxito**: `#10B981` (verde)
- **Advertencia**: `#F59E0B` (amarillo)
- **Error**: `#EF4444` (rojo)
- **Fondo**: `#F5F7FA`

### Tipografía
- **Fuente**: Poppins
- **Títulos**: 20px, weight 400, uppercase
- **Subtítulos**: 18px, weight 500

### Componentes UI
- `Button` - Con variantes (primary, secondary, outline, ghost)
- `Input` - Con label y manejo de errores
- `Card` - Contenedor con sombra
- `Badge` - Etiquetas de estado
- `Select` - Selector con opciones
- `Checkbox` - Casilla de verificación
- `KPICard` - Tarjeta de métricas con tendencia

---

## 📦 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```
DATABASE_URL=postgresql://user:password@localhost:5432/kosmos_crm
JWT_SECRET=tu-secreto-jwt
JWT_REFRESH_SECRET=tu-secreto-refresh
```

### 3. Configurar base de datos
```bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# (Opcional) Seed de datos de prueba
npx prisma db seed
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🧪 Datos de Prueba

Para probar la aplicación, necesitarás crear usuarios y empresas en la base de datos. Puedes usar Prisma Studio:

```bash
npx prisma studio
```

O crear un script de seed con datos de ejemplo.

---

## 📱 Responsive Design

Todas las vistas están optimizadas para:
- **Móvil**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Los componentes se adaptan automáticamente usando Tailwind CSS con clases responsive.

---

## 🔄 Flujo de Autenticación

1. Usuario ingresa a `/login`
2. Completa email y contraseña
3. Sistema valida credenciales
4. Si tiene **1 empresa**: redirige a `/dashboards`
5. Si tiene **2+ empresas**: redirige a `/onboarding`
6. Usuario selecciona empresa activa
7. Redirige a `/dashboards`

---

## 🚀 Próximos Pasos (Futuros Sprints)

Las siguientes vistas están preparadas en la arquitectura pero **NO implementadas**:
- Gastos
- Actividades
- Clientes
- Pipeline de Ventas
- Tickets y Soporte
- Documentos
- Contratos
- Sistema/Configuración
- Inventario
- Recursos Humanos

La estructura modular permite agregar estas vistas sin refactorizar el código existente.

---

## 📝 Notas Técnicas

### Multi-Empresa (Multi-Tenant)
- Cada usuario puede pertenecer a múltiples empresas
- Los roles son específicos por empresa
- Siempre hay una empresa activa en la sesión
- Los datos se filtran automáticamente por empresa

### Arquitectura Modular
- Cada módulo es independiente
- Separación clara: pages, components, hooks, services, types
- Reutilización de componentes UI
- Fácil escalabilidad

### Performance
- Server Components por defecto
- Client Components solo donde es necesario
- Paginación server-side
- Carga de datos optimizada con Promise.all

---

## ⚠️ Pendientes de Implementación

- Funcionalidad real de importar/exportar
- Integración con servicio de email
- Recuperación de contraseña
- Gestión de permisos granular
- Logs de auditoría
- Tests unitarios e integración
- Documentación de API (Swagger)

---

## 🛠️ Stack Tecnológico

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Poppins (Google Fonts)

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- Zod (validación)

**DevOps:**
- ESLint
- TypeScript strict mode
- Git

---

## 📄 Licencia

© 2024 KOSMOS CRM. Todos los derechos reservados.
