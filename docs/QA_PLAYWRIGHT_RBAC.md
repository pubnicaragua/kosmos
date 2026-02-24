# QA Playwright + Matriz de Roles

## 1) Objetivo

Automatizar validaciones de seguridad y operación para el esquema multi-empresa:

- Autenticación por rol (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`)
- Alcance por empresa (acceso permitido/denegado)
- Restricción de edición de empresa por rol
- Cobertura de endpoints principales por módulo

## 2) Requisitos

```bash
npm install
npx playwright install chromium
```

> Si pruebas contra servidor remoto, no necesitas levantar `npm run dev` local.

## 3) Variables opcionales para QA

```bash
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
QA_SUPER_ADMIN_EMAIL="admin@kosmoscrm.com"
QA_SUPER_ADMIN_PASSWORD="admin123"
QA_MANAGER_EMAIL="manager@kosmoscrm.com"
QA_MANAGER_PASSWORD="manager123"
QA_USER_EMAIL="user@kosmoscrm.com"
QA_USER_PASSWORD="user123"
```

## 4) Ejecutar pruebas

```bash
npm run qa:e2e
npm run qa:e2e:ui
npm run qa:e2e:report
```

## 5) Cobertura implementada

Archivo: `tests/e2e/role-access.spec.ts`

1. Login exitoso por credenciales base y cobertura de todos los roles.
2. Usuario con una empresa no puede acceder a empresas no asignadas.
3. `PUT /api/companies/:id`:
   - `SUPER_ADMIN`, `ADMIN` => permitido (200)
   - `MANAGER`, `USER` => denegado (403)
4. Endpoints principales por módulo responden 200 dentro del scope autorizado.

## 6) Estado actual del modelo de permisos

- El acceso principal está basado en la relación `user_companies` (usuario+empresa+rol).
- `SUPER_ADMIN` puede ver todas las empresas en `GET /api/companies`.
- No existe todavía un RBAC dinámico por módulo/operación configurable desde UI.

## 7) Próximo paso recomendado (fase enterprise)

Implementar RBAC dinámico con:

- Tabla `roles` (custom por tenant)
- Tabla `permissions` (módulo + acción: read/create/update/delete/approve/export)
- Tabla pivote `role_permissions`
- Reemplazar enum fijo `UserRole` por referencia a `role_id`
- Middleware de autorización centralizado para APIs y navegación
