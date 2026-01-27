# Módulos del Sistema

Cada módulo es independiente y contiene su propia estructura:

## Estructura de cada módulo:

```
module-name/
├── pages/          # Páginas específicas del módulo
├── components/     # Componentes específicos del módulo
├── hooks/          # Hooks personalizados del módulo
├── services/       # Servicios API del módulo
└── types/          # Tipos TypeScript del módulo
```

## Módulos disponibles:

1. **auth** - Autenticación y autorización
2. **dashboards** - Dashboards y métricas
3. **incomes** - Gestión de ingresos
4. **expenses** - Gestión de gastos
5. **activities** - Registro de actividades
6. **clients** - Gestión de clientes
7. **sales-pipeline** - Pipeline de ventas
8. **support** - Tickets y soporte
9. **documents** - Gestión de documentos
10. **contracts** - Gestión de contratos
11. **system** - Configuración del sistema
12. **inventory** - Control de inventario
13. **hr** - Recursos humanos

Cada módulo debe ser autocontenido y no depender directamente de otros módulos.
