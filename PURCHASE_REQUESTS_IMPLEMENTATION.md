# Sistema de Solicitud de Compras - Implementación Completa

## ✅ Cambios Completados

### 1. Schema de Base de Datos (Prisma)

**Modelo PurchaseRequest:**
- `requestNumber`: Número único autogenerado (SC-000001, SC-000002...)
- `requestDate`: Fecha de solicitud
- `requestingArea`: Área solicitante
- `requestedBy`: ID del usuario solicitante
- `requestType`: Tipo (REPOSICION, PRODUCTO_NUEVO, PEDIDO_ESPECIAL)
- `priority`: Prioridad (BAJA, MEDIA, ALTA)
- `status`: Estado (PENDIENTE, APROBADA, RECHAZADA, COMPRADO, RECIBIDO)
- `approvedBy`, `approvedAt`: Datos de aprobación
- `rejectedReason`: Motivo de rechazo
- `purchasedAt`, `receivedAt`: Fechas de compra y recepción
- `notes`: Notas adicionales

**Modelo PurchaseRequestItem:**
- `productId`: Referencia al producto del inventario
- `sku`: Código SKU
- `productName`: Nombre del producto
- `category`: Categoría
- `currentStock`: Stock actual
- `minimumStock`: Stock mínimo
- `requestedQuantity`: Cantidad solicitada
- `reason`: Motivo (Agotado, Alta demanda, Proyecto)
- `lastSaleDate`: Fecha de última venta
- `monthlyAverage`: Promedio mensual de ventas
- `unitCost`, `totalCost`: Costos

### 2. API Backend

**POST /api/purchase-requests**
- Crear nueva solicitud de compra
- Generación automática de número de solicitud
- Cálculo automático de totales

**GET /api/purchase-requests**
- Listar solicitudes con filtros:
  - Por empresa
  - Por estado
  - Por prioridad
  - Por tipo
  - Búsqueda por texto

**GET /api/purchase-requests/[id]**
- Obtener detalle de solicitud específica

**PUT /api/purchase-requests/[id]**
- Actualizar solicitud
- Actualización automática de fechas según estado
- Actualización automática de inventario al recibir (opcional)

**DELETE /api/purchase-requests/[id]**
- Eliminar solicitud

**GET /api/purchase-requests/kpis**
- KPIs y métricas:
  - Productos con stock bajo
  - Top 20 productos más vendidos del mes
  - Productos sin rotación en 90 días
  - Productos más rentables
  - Tiempo promedio de reposición
  - Estadísticas generales

### 3. Validaciones
- Schema Zod completo para solicitudes y items
- Validación de cantidades mínimas
- Validación de campos requeridos

## 📋 Flujo del Proceso

1. **Área detecta faltante** → Estado: PENDIENTE
2. **Se crea solicitud** → Número autogenerado (SC-XXXXXX)
3. **Jefe aprueba** → Estado: APROBADA (approvedBy, approvedAt)
4. **Compras cotiza** → Se actualiza información de costos
5. **Se genera orden de compra** → Estado: COMPRADO (purchasedAt)
6. **Se recibe producto** → Estado: RECIBIDO (receivedAt)
7. **Inventario se actualiza automáticamente** → Stock incrementado

## 🎯 Tipos de Solicitud

1. **REPOSICION**: Reposición de stock
2. **PRODUCTO_NUEVO**: Producto nuevo
3. **PEDIDO_ESPECIAL**: Pedido especial

## 📊 Prioridades

1. **ALTA**: Urgente
2. **MEDIA**: Normal
3. **BAJA**: Puede esperar

## 🔄 Estados

1. **PENDIENTE**: Esperando aprobación
2. **APROBADA**: Aprobada por jefe
3. **RECHAZADA**: Rechazada (con motivo)
4. **COMPRADO**: Orden de compra generada
5. **RECIBIDO**: Producto recibido e inventario actualizado

## 📈 KPIs Disponibles

### 1. Productos con Stock Bajo
- Lista de productos donde stock < minStock
- Ordenados por diferencia (más críticos primero)
- Incluye: nombre, SKU, stock actual, stock mínimo, diferencia

### 2. Top 20 Productos Más Vendidos del Mes
- Basado en solicitudes del mes actual
- Suma de cantidades solicitadas por producto
- Útil para planificar compras futuras

### 3. Productos Sin Rotación en 90 Días
- Productos que no han tenido solicitudes en 90 días
- Incluye valor total en inventario (stock × costo)
- Ayuda a identificar productos obsoletos

### 4. Productos Más Rentables
- Top 20 productos con mayor margen
- Incluye: costo, precio, margen absoluto y porcentual
- Útil para priorizar compras

### 5. Tiempo Promedio de Reposición
- Promedio de días entre solicitud y recepción
- Calculado solo para solicitudes completadas
- Útil para planificación de tiempos

### 6. Estadísticas Generales
- Total de solicitudes
- Por estado (pendientes, aprobadas, rechazadas, etc.)
- Por tipo (reposición, producto nuevo, pedido especial)
- Por prioridad (alta, media, baja)

## 🔗 Integraciones

- ✅ **Inventario**: Relación directa con productos
- ✅ **Usuarios**: Solicitante y aprobador
- ✅ **Empresas**: Multi-empresa
- ⏳ **Proveedores**: Pendiente de implementar
- ⏳ **Órdenes de Compra**: Pendiente de implementar
- ⏳ **Facturación**: Pendiente de implementar

## 🚀 Características Especiales

### Actualización Automática de Inventario
Al marcar una solicitud como RECIBIDO, el sistema puede:
- Incrementar automáticamente el stock de cada producto
- Solo si se envía el parámetro `updateInventory: true`
- Actualiza solo productos que tengan `productId`

### Generación Automática de Número
- Formato: SC-000001, SC-000002, etc.
- Único por empresa
- Secuencial

### Cálculo Automático de Totales
- `totalCost = unitCost × requestedQuantity`
- Se calcula automáticamente al crear/actualizar

### Fechas Automáticas
- `approvedAt`: Se establece al aprobar
- `purchasedAt`: Se establece al marcar como comprado
- `receivedAt`: Se establece al marcar como recibido

## 📝 Ejemplo de Uso

### Crear Solicitud
```json
POST /api/purchase-requests
{
  "companyId": "xxx",
  "requestingArea": "Ventas",
  "requestedBy": "userId",
  "requestType": "REPOSICION",
  "priority": "ALTA",
  "notes": "Stock crítico",
  "items": [
    {
      "productId": "prod123",
      "productName": "Cámara IP 2MP",
      "sku": "CAM-IP-2MP",
      "category": "Cámaras",
      "currentStock": 2,
      "minimumStock": 10,
      "requestedQuantity": 15,
      "reason": "Agotado",
      "unitCost": 45.00,
      "monthlyAverage": 8.5
    }
  ]
}
```

### Aprobar Solicitud
```json
PUT /api/purchase-requests/[id]
{
  "status": "APROBADA"
}
```

### Recibir y Actualizar Inventario
```json
PUT /api/purchase-requests/[id]
{
  "status": "RECIBIDO",
  "updateInventory": true
}
```

## 🔧 Pasos para Aplicar

### En Desarrollo
```bash
npx prisma generate
npx prisma migrate dev
```

### En Producción (Servidor)
```bash
cd ~/kosmos
git pull origin main
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart kosmos-crm
```

## 📱 Frontend Pendiente

Crear interfaz en `src/app/(dashboard)/solicitudes-compra/page.tsx` con:

1. **Lista de solicitudes** con filtros
2. **Formulario de creación** con:
   - Selector de productos del inventario
   - Información automática de stock actual/mínimo
   - Cálculo automático de totales
   - Motivo de solicitud
3. **Panel de KPIs** mostrando:
   - Productos con stock bajo (alerta)
   - Top productos vendidos
   - Productos sin rotación
   - Tiempo promedio de reposición
4. **Flujo de aprobación** visual
5. **Actualización de inventario** al recibir

## ⚠️ Notas Importantes

1. Los errores de TypeScript se resolverán después de `npx prisma generate`
2. La actualización automática de inventario es opcional
3. El sistema calcula automáticamente todas las métricas
4. Las fechas se establecen automáticamente según el estado
