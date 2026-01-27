# CRM Multi-Empresa

Sistema CRM empresarial multi-empresa construido con Next.js, TypeScript y TailwindCSS.

## 🏗️ Arquitectura

Este proyecto sigue una arquitectura modular y escalable diseñada para soportar múltiples empresas y módulos empresariales.

### Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS
- **Arquitectura**: Modular y escalable

## 📁 Estructura del Proyecto

```
windsurf-project/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Grupo de rutas de autenticación
│   │   │   ├── login/           # Página de login
│   │   │   └── layout.tsx       # Layout de autenticación
│   │   ├── (dashboard)/         # Grupo de rutas del dashboard
│   │   │   ├── dashboards/      # Módulo de dashboards
│   │   │   ├── ingresos/        # Módulo de ingresos
│   │   │   ├── gastos/          # Módulo de gastos
│   │   │   ├── actividades/     # Módulo de actividades
│   │   │   ├── clientes/        # Módulo de clientes
│   │   │   ├── pipeline-ventas/ # Módulo de pipeline de ventas
│   │   │   ├── soporte/         # Módulo de tickets y soporte
│   │   │   ├── documentos/      # Módulo de documentos
│   │   │   ├── contratos/       # Módulo de contratos
│   │   │   ├── inventario/      # Módulo de inventario
│   │   │   ├── rrhh/            # Módulo de recursos humanos
│   │   │   ├── sistema/         # Módulo de configuración
│   │   │   └── layout.tsx       # Layout principal con Sidebar + Header
│   │   ├── api/                 # API Routes
│   │   ├── layout.tsx           # Layout raíz
│   │   ├── page.tsx             # Página principal (redirige a login)
│   │   └── globals.css          # Estilos globales
│   │
│   ├── components/              # Componentes compartidos
│   │   ├── ui-kit/             # Componentes del Design System
│   │   ├── layout/             # Componentes de layout
│   │   │   ├── Sidebar.tsx     # Barra lateral de navegación
│   │   │   └── Header.tsx      # Encabezado superior
│   │   └── common/             # Componentes comunes reutilizables
│   │
│   ├── modules/                # Módulos del sistema
│   │   ├── auth/               # Módulo de autenticación
│   │   ├── dashboards/         # Módulo de dashboards
│   │   ├── incomes/            # Módulo de ingresos
│   │   ├── expenses/           # Módulo de gastos
│   │   ├── activities/         # Módulo de actividades
│   │   ├── clients/            # Módulo de clientes
│   │   ├── sales-pipeline/     # Módulo de pipeline de ventas
│   │   ├── support/            # Módulo de soporte
│   │   ├── documents/          # Módulo de documentos
│   │   ├── contracts/          # Módulo de contratos
│   │   ├── system/             # Módulo de sistema
│   │   ├── inventory/          # Módulo de inventario
│   │   └── hr/                 # Módulo de RRHH
│   │       ├── pages/          # Páginas del módulo
│   │       ├── components/     # Componentes del módulo
│   │       ├── hooks/          # Hooks del módulo
│   │       ├── services/       # Servicios API del módulo
│   │       └── types/          # Tipos TypeScript del módulo
│   │
│   ├── hooks/                  # Hooks globales
│   │   └── useAuth.ts          # Hook de autenticación
│   │
│   ├── services/               # Servicios globales
│   │   └── api.ts              # Cliente API base
│   │
│   ├── types/                  # Tipos TypeScript globales
│   │   ├── common.ts           # Tipos comunes
│   │   └── index.ts            # Exportaciones de tipos
│   │
│   ├── utils/                  # Utilidades
│   │   └── cn.ts               # Utilidad para clases CSS
│   │
│   ├── store/                  # Estado global (preparado para Zustand/Redux)
│   │
│   └── config/                 # Configuraciones
│       └── navigation.ts       # Configuración de navegación
│
├── public/                     # Archivos estáticos
├── docs/                       # Documentación
├── package.json                # Dependencias del proyecto
├── tsconfig.json               # Configuración de TypeScript
├── next.config.js              # Configuración de Next.js
├── tailwind.config.ts          # Configuración de Tailwind
├── postcss.config.js           # Configuración de PostCSS
├── .eslintrc.json              # Configuración de ESLint
├── .gitignore                  # Archivos ignorados por Git
├── .env.example                # Variables de entorno de ejemplo
└── README.md                   # Este archivo
```

## 🎯 Características de la Arquitectura

### 1. Modularidad
- Cada módulo es independiente y autocontenido
- Separación clara de responsabilidades
- Fácil de escalar y mantener

### 2. Multi-Empresa
- Preparado para manejar múltiples empresas
- Campo `empresa_id` en todas las entidades base
- Aislamiento de datos por empresa

### 3. Layout Global
- **Sidebar**: Navegación lateral con todos los módulos
- **Header**: Encabezado con información del usuario
- **Content Area**: Área principal de contenido

### 4. Rutas y Navegación
- Rutas organizadas por grupos con `(auth)` y `(dashboard)`
- Navegación centralizada en `src/config/navigation.ts`
- Rutas en español para mejor UX

### 5. Design System
- Carpeta `ui-kit` preparada para componentes reutilizables
- Sin estilos personalizados aún (pendiente de definición)
- TailwindCSS para estilos utilitarios

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar en producción
npm start
```

## 📋 Módulos del Sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Autenticación de usuarios |
| Dashboards | `/dashboards` | Métricas y dashboards |
| Ingresos | `/ingresos` | Gestión de ingresos |
| Gastos | `/gastos` | Gestión de gastos |
| Actividades | `/actividades` | Registro de actividades |
| Clientes | `/clientes` | Gestión de clientes |
| Pipeline de Ventas | `/pipeline-ventas` | Pipeline de ventas |
| Tickets y Soporte | `/soporte` | Sistema de tickets |
| Documentos | `/documentos` | Gestión documental |
| Contratos | `/contratos` | Gestión de contratos |
| Inventario | `/inventario` | Control de inventario |
| Recursos Humanos | `/rrhh` | Gestión de RRHH |
| Sistema | `/sistema` | Configuración del sistema |

## 🔧 Próximos Pasos

1. **Instalar dependencias**: `npm install`
2. **Definir componentes del UI Kit**: Botones, inputs, tablas, etc.
3. **Implementar lógica de autenticación**: JWT, sesiones, etc.
4. **Desarrollar lógica de negocio por módulo**: Según requerimientos
5. **Integrar con backend**: API endpoints y servicios
6. **Implementar control de roles**: Permisos por módulo
7. **Agregar tablas editables tipo Excel**: Funcionalidad de edición inline

## 📝 Convenciones de Código

- **Nombres de archivos**: PascalCase para componentes, camelCase para utilidades
- **Componentes**: Usar TypeScript con tipos explícitos
- **Estilos**: TailwindCSS con clases utilitarias
- **Imports**: Usar alias `@/` para imports absolutos
- **Estructura**: Cada módulo debe ser autocontenido

## 🎨 Design System

El proyecto está preparado para recibir un Design System con:
- Botones con variantes
- Inputs y formularios
- Tablas editables
- Cards y contenedores
- Badges y etiquetas
- Modales y diálogos
- Estados de carga
- Iconografía consistente

## 🔐 Multi-Empresa

Todas las entidades base incluyen:
- `id`: Identificador único
- `empresa_id`: ID de la empresa (para multi-tenancy)
- `created_at`: Fecha de creación
- `updated_at`: Fecha de actualización

## 📦 Estado del Proyecto

✅ **Completado**:
- Estructura de carpetas
- Configuración base (Next.js, TypeScript, Tailwind)
- Layout global (Sidebar + Header)
- Rutas y navegación
- Páginas placeholder de todos los módulos
- Tipos base y servicios
- Arquitectura modular

⏳ **Pendiente**:
- Componentes del UI Kit
- Lógica de autenticación
- Lógica de negocio por módulo
- Integración con backend
- Control de roles y permisos
- Tablas editables tipo Excel

---

**Nota**: Este es un scaffold base. No contiene lógica de negocio ni estilos visuales definidos. Está preparado para recibir el desarrollo de funcionalidades específicas.
