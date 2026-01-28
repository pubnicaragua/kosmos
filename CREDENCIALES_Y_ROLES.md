# 🔐 CREDENCIALES DE ACCESO Y ROLES

**Fecha:** 27 de enero de 2026  
**Sistema:** KOSMOS CRM v1.0

---

## 📋 CREDENCIALES DE LOGIN

### 👑 SUPER ADMIN (Acceso Total)
```
Email: admin@kosmoscrm.com
Password: admin123
Nombre: Carlos Méndez
```

**Permisos:**
- ✅ Acceso a todas las empresas
- ✅ Gestión completa de usuarios
- ✅ Configuración del sistema
- ✅ Todos los módulos (lectura/escritura/eliminación)
- ✅ Reportes y analytics completos
- ✅ Gestión de roles y permisos

---

### 👔 MANAGER (Gestión y Reportes)
```
Email: manager@kosmoscrm.com
Password: manager123
Nombre: Ana García
```

**Permisos:**
- ✅ Acceso a empresas asignadas
- ✅ Gestión de clientes, cotizaciones, productos
- ✅ Aprobación de cotizaciones >$5,000
- ✅ Reportes y dashboards
- ✅ Gestión de tickets y soporte
- ❌ No puede eliminar datos críticos
- ❌ No puede gestionar usuarios

---

### 👤 USER (Operaciones Básicas)
```
Email: user@kosmoscrm.com
Password: user123
Nombre: Juan Pérez
```

**Permisos:**
- ✅ Acceso a empresa asignada
- ✅ Crear y editar clientes
- ✅ Crear cotizaciones (requiere aprobación si >$5,000)
- ✅ Gestión de tickets asignados
- ✅ Consulta de inventario
- ❌ No puede eliminar registros
- ❌ No puede aprobar cotizaciones
- ❌ No puede ver reportes financieros completos

---

## 🏢 EMPRESAS DE PRUEBA

### Tech Solutions S.A.
- **ID:** company-tech-solutions
- **Industria:** Tecnología
- **Usuarios:** Admin, Manager, User
- **Datos:** 10 ingresos, 10 gastos, 10 actividades, 7 clientes, 8 productos, 6 tickets

### Marketing Pro Ltd.
- **ID:** company-marketing-pro
- **Industria:** Marketing Digital
- **Usuarios:** Admin
- **Datos:** Sin datos de prueba

---

## 📊 DATOS DE PRUEBA DISPONIBLES

### Módulo Clientes (7 registros)
- Acme Corporation (ACTIVO)
- Global Tech SA (PROSPECTO)
- Innovate Solutions (PROPUESTA)
- Digital Marketing Pro (NEGOCIACIÓN)
- Enterprise Systems (CALIFICADO)
- Cloud Services Inc (ACTIVO)
- Tech Startup (PROSPECTO)

### Módulo Inventario
**Categorías (4):**
- Hardware
- Software
- Servicios
- Consumibles

**Productos (8):**
- Laptop Dell XPS 15 (Stock: 15)
- Monitor LG 27" (Stock: 8)
- Licencia Office 365 (Stock: 50)
- Antivirus Kaspersky (Stock: 30)
- Consultoría IT (Stock: 100)
- Soporte Técnico (Stock: 100)
- Teclado Mecánico (Stock: 25)
- Mouse Inalámbrico (Stock: 40)

### Módulo Cotizaciones (2 registros)
- COT-2024-001 (DRAFT) - $3,933
- COT-2024-002 (SENT) - $1,311

### Módulo Tickets (6 registros)
- Error en módulo de facturación (ALTA - PROCESO1)
- Solicitud nueva funcionalidad (MEDIA - PROCESO2)
- Consulta sobre licencias (BAJA - PROCESO3)
- Problema de rendimiento (ALTA - PROCESO1)
- Capacitación usuarios (MEDIA - PROCESO4)
- Migración de datos (ALTA - PROCESO2)

### Módulo Ingresos (10 registros)
- Total: $81,600
- Pagados: $66,400
- Pendientes: $15,200

### Módulo Gastos (10 registros)
- Total: $4,840
- Pagados: $3,685
- Pendientes: $1,155

### Módulo Actividades (10 registros)
- Completadas: 4
- En progreso: 2
- Pendientes: 4

### Módulo Pipeline (10 oportunidades)
- Valor total: $326,000
- Etapas: PROSPECTO, PROPUESTA, NEGOCIACIÓN, CALIFICADO

### Módulo Documentos (5 registros)
- Contratos, propuestas, reportes, logos, manuales

### Módulo Contratos (5 registros)
- Activos: 3
- Por vencer: 1
- Expirados: 1

---

## 🎯 DIFERENCIAS ENTRE ROLES

| Funcionalidad | SUPER_ADMIN | MANAGER | USER |
|--------------|-------------|---------|------|
| Ver Dashboard | ✅ | ✅ | ✅ |
| Gestionar Clientes | ✅ | ✅ | ✅ (solo crear/editar) |
| Crear Cotizaciones | ✅ | ✅ | ✅ |
| Aprobar Cotizaciones >$5K | ✅ | ✅ | ❌ |
| Gestionar Inventario | ✅ | ✅ | ✅ (solo consulta) |
| Gestionar Tickets | ✅ | ✅ | ✅ (solo asignados) |
| Ver Reportes Financieros | ✅ | ✅ | ❌ |
| Gestionar Usuarios | ✅ | ❌ | ❌ |
| Eliminar Registros | ✅ | ❌ | ❌ |
| Configuración Sistema | ✅ | ❌ | ❌ |
| Acceso Multi-Empresa | ✅ | ✅ (asignadas) | ❌ (solo 1) |

---

## 🔄 CÓMO EJECUTAR EL SEED

Para poblar la base de datos con todos los datos de prueba:

```bash
# 1. Asegúrate de tener la base de datos configurada
# Verifica el archivo .env con DATABASE_URL

# 2. Ejecuta las migraciones
npm run db:migrate

# 3. Ejecuta el seed
npm run db:seed
```

**Resultado esperado:**
```
✅ Usuarios creados: admin@kosmoscrm.com manager@kosmoscrm.com user@kosmoscrm.com
✅ Empresas creadas: Tech Solutions S.A. Marketing Pro Ltd.
✅ Relaciones usuario-empresa creadas (3 usuarios con roles diferentes)
✅ 10 ingresos creados
✅ 10 gastos creados
✅ 10 actividades creadas
✅ 10 oportunidades creadas
✅ 5 documentos creados
✅ 5 contratos creados
✅ 7 clientes creados
✅ 4 categorías de productos creadas
✅ 8 productos creados
✅ 2 cotizaciones creadas
✅ 6 tickets creados
```

---

## 🚀 FLUJO DE TRABAJO RECOMENDADO

### Para Demostración al Cliente:

1. **Login como SUPER_ADMIN** (`admin@kosmoscrm.com`)
   - Mostrar dashboard completo con KPIs
   - Navegar por todos los módulos
   - Demostrar gestión de clientes
   - Crear una cotización nueva
   - Mostrar Kanban de tickets

2. **Login como MANAGER** (`manager@kosmoscrm.com`)
   - Mostrar permisos de gestión
   - Aprobar una cotización
   - Gestionar tickets
   - Ver reportes

3. **Login como USER** (`user@kosmoscrm.com`)
   - Mostrar vista limitada
   - Crear cliente
   - Crear cotización (sin aprobación)
   - Gestionar tickets asignados

---

## 📝 NOTAS IMPORTANTES

- **Contraseñas:** Todas las contraseñas de prueba son simples (`admin123`, `manager123`, `user123`). En producción, usar contraseñas seguras.
- **Datos:** Los datos de prueba son ficticios y solo para demostración.
- **Multi-empresa:** El SUPER_ADMIN tiene acceso a ambas empresas, los demás solo a Tech Solutions S.A.
- **Seed:** El comando `npm run db:seed` es idempotente (puede ejecutarse múltiples veces sin duplicar datos).

---

## 🔒 SEGURIDAD

- ✅ Todas las contraseñas están hasheadas con bcrypt
- ✅ JWT tokens para autenticación
- ✅ Validación Zod en todos los endpoints
- ✅ Filtrado por empresa (multi-tenant)
- ✅ Verificación de permisos en cada endpoint

---

**¡El sistema está listo para demostración!** 🎉
