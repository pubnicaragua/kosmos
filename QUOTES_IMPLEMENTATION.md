# Módulo de Cotizaciones Mejorado - Implementación Completa

## ✅ Mejoras Implementadas

### 1. Nuevos Campos en el Schema

**Campos de Contacto:**
- `contactName`: Nombre del contacto
- `contactEmail`: Email del contacto
- `contactPhone`: Teléfono del contacto

**Gestión de Ventas:**
- `assignedTo`: Vendedor asignado (ID de usuario)
- `clientType`: Tipo de cliente (NUEVO, RECURRENTE, PROYECTO)
- `closeProbability`: Probabilidad de cierre (0-100%)

**Fechas del Flujo:**
- `issueDate`: Fecha de emisión
- `sentAt`: Fecha de envío al cliente
- `approvedAt`: Fecha de aprobación
- `rejectedAt`: Fecha de rechazo
- `closedAt`: Fecha de cierre

**Seguimiento:**
- `rejectionReason`: Motivo de rechazo

### 2. API de KPIs - GET /api/quotes/kpis

**Métricas Principales:**

1. **Tasa de Cierre (%)**
   - Porcentaje de cotizaciones aprobadas vs total

2. **Tiempo Promedio de Cierre (días)**
   - Desde emisión hasta cierre

3. **Tiempo Promedio de Respuesta (días)**
   - Desde emisión hasta envío

4. **Probabilidad Promedio de Cierre**
   - Promedio de todas las probabilidades

**Estadísticas Generales:**
- Total de cotizaciones
- Cotizaciones aprobadas
- Cotizaciones rechazadas
- Cotizaciones vencidas
- Cotizaciones pendientes
- Monto total cotizado
- Monto total aprobado

**Análisis por Vendedor:**
- Cotizaciones enviadas por vendedor
- Cotizaciones aprobadas por vendedor
- Monto total vendido por vendedor
- Ranking de vendedores

**Análisis de Productos:**
- Top 20 productos más cotizados
- Cantidad total solicitada por producto
- Frecuencia de cotización

**Análisis Temporal:**
- Monto total cotizado por mes
- Tendencias de cotización

**Análisis de Rechazos:**
- Top 10 motivos de rechazo más frecuentes
- Distribución de rechazos

**Distribuciones:**
- Por estado (DRAFT, SENT, APPROVED, REJECTED, EXPIRED)
- Por tipo de cliente (NUEVO, RECURRENTE, PROYECTO)

## 🔄 Flujo del Proceso

1. **Se registra oportunidad en el CRM** → Estado: DRAFT
2. **Se genera cotización** → `issueDate` establecida
3. **Se asigna vendedor** → `assignedTo` establecido
4. **Se establece probabilidad** → `closeProbability` (0-100%)
5. **Se envía al cliente** → Estado: SENT, `sentAt` establecida
6. **Seguimiento automático** → Basado en fechas
7. **Cliente aprueba** → Estado: APPROVED, `approvedAt` establecida
8. **Cliente rechaza** → Estado: REJECTED, `rejectedAt` y `rejectionReason`
9. **Se convierte en venta** → `closedAt` establecida

## 📊 Tipos de Cliente

1. **NUEVO**: Cliente nuevo, primera cotización
2. **RECURRENTE**: Cliente existente, compras regulares
3. **PROYECTO**: Cliente de proyecto específico

## 🎯 Estados de Cotización

1. **DRAFT**: Borrador, en preparación
2. **SENT**: Enviada al cliente
3. **APPROVED**: Aprobada por el cliente
4. **REJECTED**: Rechazada por el cliente
5. **EXPIRED**: Vencida (pasó `validUntil`)

## 📈 Ejemplo de Respuesta de KPIs

```json
{
  "closeRate": 35.5,
  "avgCloseTime": 5.2,
  "avgResponseTime": 1.3,
  "avgCloseProbability": 62.5,
  "totalQuotes": 150,
  "approvedQuotes": 53,
  "rejectedQuotes": 25,
  "expiredQuotes": 12,
  "pendingQuotes": 60,
  "totalQuotedAmount": 450000,
  "totalApprovedAmount": 180000,
  "quotesBySeller": [
    {
      "sellerId": "user123",
      "sellerName": "Juan Pérez",
      "count": 45,
      "approvedCount": 18,
      "totalAmount": 75000
    }
  ],
  "topProducts": [
    {
      "productId": "prod456",
      "name": "Cámara IP 2MP",
      "sku": "CAM-IP-2MP",
      "count": 35,
      "totalQuantity": 280
    }
  ],
  "monthlyQuotedAmounts": [
    { "month": "2026-01", "amount": 120000 },
    { "month": "2026-02", "amount": 150000 }
  ],
  "topRejectionReasons": [
    { "reason": "Precio muy alto", "count": 12 },
    { "reason": "Tiempo de entrega", "count": 8 }
  ]
}
```

## 🔧 Migración de Datos

La migración SQL incluye:
- Adición de todos los campos nuevos
- Establecimiento de `issueDate` desde `createdAt` para cotizaciones existentes
- Clasificación automática de clientes ACTIVOS como RECURRENTE
- Creación de índices para mejor rendimiento

## 📝 Validaciones Actualizadas

El schema Zod ahora incluye:
- Validación de email para contacto
- Validación de probabilidad (0-100)
- Validación de tipo de cliente
- Todos los campos opcionales apropiados

## 🔗 Integraciones

- ✅ **Clientes**: Relación directa
- ✅ **Productos**: Items de cotización
- ✅ **Usuarios**: Vendedor asignado
- ✅ **Empresas**: Multi-empresa
- ⏳ **Oportunidades**: Conversión pendiente
- ⏳ **Órdenes de Trabajo**: Conversión pendiente
- ⏳ **Facturación**: Conversión pendiente

## 🚀 Características Especiales

### Cálculo Automático de Métricas
- Tiempos calculados automáticamente desde las fechas
- Tasas de cierre calculadas en tiempo real
- Rankings dinámicos de vendedores y productos

### Seguimiento de Vencimiento
- Identificación automática de cotizaciones vencidas
- Basado en `validUntil` vs fecha actual

### Análisis de Rendimiento
- Por vendedor (cantidad y monto)
- Por producto (frecuencia y cantidad)
- Por período (tendencias mensuales)

## ⚠️ Notas Importantes

1. Los errores de TypeScript se resolverán después de `npx prisma generate`
2. Todas las fechas se establecen automáticamente según el flujo
3. La probabilidad de cierre es opcional y por defecto es 50%
4. El sistema identifica automáticamente cotizaciones vencidas
